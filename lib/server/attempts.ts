import { getD1 } from "@/db";
import {
  initialSchedulerState,
  scheduleCard,
  SCHEDULER_VERSION,
  type CardStatus,
  type SchedulerRating,
  type SchedulerState,
} from "@/lib/scheduler";
import type { RequestUser } from "@/lib/server/auth";
import type {
  AchievementDTO,
  AttemptRequest,
  Confidence,
} from "@/lib/server/types";
import {
  addUtcDays,
  clamp,
  HttpError,
  isoDateInTimeZone,
  levelFromXp,
  makeId,
  normalizeAnswer,
  round,
} from "@/lib/server/utils";

export type AttemptResult = {
  attemptId: string;
  questionId: string;
  isCorrect: boolean;
  matchType: "canonical" | "alias" | "miss";
  correctAnswer: string;
  acceptedAnswers: string[];
  explanation: string;
  rating: SchedulerRating;
  confidence: Confidence;
  confidenceProvided: boolean;
  hintUsed: boolean;
  xpAwarded: number;
  totalXp: number;
  level: number;
  streakDays: number;
  scheduler: {
    cardId: string;
    status: CardStatus;
    dueAt: string;
    intervalDays: number;
    easeFactor: number;
    repetitions: number;
    lapses: number;
  };
  topicEstimate: {
    topicId: string;
    mastery: number;
    coverage: number;
    opportunity: number;
    accuracy: number;
    meanConfidence: number;
    calibration: number;
  };
  unlockedAchievements: AchievementDTO[];
};

type QuestionRow = {
  id: string;
  topic_id: string;
  answer: string;
  explanation: string;
  difficulty: number;
  importance_weight: number;
  question_count: number;
};

type StateRow = {
  card_id: string;
  status: CardStatus;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
  due_at: string;
  last_reviewed_at: string | null;
  last_rating: SchedulerRating | null;
};

type EstimateRow = {
  id: string;
  attempt_count: number;
  correct_count: number;
  distinct_questions: number;
  confidence_count: number;
  confidence_sum: number;
  brier_sum: number;
};

export async function recordAttempt(
  user: RequestUser,
  input: AttemptRequest,
  now = new Date(),
): Promise<{ idempotent: boolean; result: AttemptResult }> {
  const db = getD1();
  const existing = await db
    .prepare(
      "SELECT id FROM attempts WHERE user_id = ? AND client_attempt_id = ?",
    )
    .bind(user.id, input.clientAttemptId)
    .first<{ id: string }>();
  if (existing) {
    return {
      idempotent: true,
      result: await readAttemptResult(db, user.id, existing.id, []),
    };
  }

  const question = await getQuestion(db, user.id, input.questionId);
  if (!question) throw new HttpError(404, "That question is unavailable.");
  const aliases = await getAliases(db, question.id);
  const normalized = normalizeAnswer(input.answer);
  const canonical = normalizeAnswer(question.answer);
  const matchedAlias = aliases.find(
    (alias) => normalizeAnswer(alias) === normalized,
  );
  const isCorrect = Boolean(normalized) && (normalized === canonical || Boolean(matchedAlias));
  const matchType: AttemptResult["matchType"] =
    normalized === canonical && isCorrect
      ? "canonical"
      : isCorrect
        ? "alias"
        : "miss";
  const confidence = input.confidence ?? "medium";
  const confidenceProvided = input.confidence !== undefined;
  const hintUsed = input.hintUsed ?? false;
  const requestedRating = input.rating ?? inferRating(isCorrect, input.responseMs);
  const rating: SchedulerRating = !isCorrect
    ? "again"
    : hintUsed && requestedRating === "easy"
      ? "good"
      : requestedRating;
  const xpAwarded = calculateXp(
    isCorrect,
    Number(question.difficulty),
    rating,
    input.responseMs,
    hintUsed,
  );
  const nowIso = now.toISOString();

  const state = await ensureCardState(db, user.id, question.id, now);
  const previousState: SchedulerState = {
    easeFactor: Number(state.ease_factor),
    intervalDays: Number(state.interval_days),
    repetitions: Number(state.repetitions),
    lapses: Number(state.lapses),
    dueAt: state.due_at,
    lastReviewedAt: state.last_reviewed_at,
    lastRating: state.last_rating,
    status: state.status,
  };
  const nextState = scheduleCard(previousState, rating, now);
  const estimate = await getEstimate(db, user.id, question.topic_id);
  const firstQuestionAttempt = !(await db
    .prepare(
      "SELECT 1 AS found FROM attempts WHERE user_id = ? AND question_id = ? LIMIT 1",
    )
    .bind(user.id, question.id)
    .first<{ found: number }>());
  const nextEstimate = calculateEstimate({
    previous: estimate,
    correct: isCorrect,
    confidence,
    confidenceProvided,
    firstQuestionAttempt,
    questionCount: Number(question.question_count),
    importanceWeight: Number(question.importance_weight),
  });
  const today = isoDateInTimeZone(now);
  const nextStreak = calculateStreak(user.lastStudyDate, user.streakDays, today);
  const attemptId = makeId("att");
  const reviewId = makeId("rev");
  const ledgerId = makeId("xp");
  const estimateId = estimate?.id ?? makeId("ute");
  await db.batch([
    db
      .prepare(
        `INSERT INTO attempts (
          id, user_id, question_id, card_id, client_attempt_id,
          raw_answer, normalized_answer, is_correct, match_type, rating,
          confidence, confidence_provided, hint_used, response_ms, mode,
          xp_awarded, attempted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, client_attempt_id) DO NOTHING`,
      )
      .bind(
        attemptId,
        user.id,
        question.id,
        state.card_id,
        input.clientAttemptId,
        input.answer,
        normalized,
        isCorrect ? 1 : 0,
        matchType,
        rating,
        confidence,
        confidenceProvided ? 1 : 0,
        hintUsed ? 1 : 0,
        input.responseMs ?? null,
        input.mode ?? "review",
        xpAwarded,
        nowIso,
      ),
    db
      .prepare(
        `UPDATE card_scheduler_state SET
          ease_factor = ?, interval_days = ?, repetitions = ?, lapses = ?,
          due_at = ?, last_reviewed_at = ?, last_rating = ?,
          scheduler_version = ?, updated_at = ?
        WHERE card_id = ? AND EXISTS (SELECT 1 FROM attempts WHERE id = ?)`,
      )
      .bind(
        nextState.easeFactor,
        nextState.intervalDays,
        nextState.repetitions,
        nextState.lapses,
        nextState.dueAt,
        nowIso,
        rating,
        SCHEDULER_VERSION,
        nowIso,
        state.card_id,
        attemptId,
      ),
    db
      .prepare(
        `UPDATE study_cards SET status = ?, updated_at = ?
         WHERE id = ? AND EXISTS (SELECT 1 FROM attempts WHERE id = ?)`,
      )
      .bind(nextState.status, nowIso, state.card_id, attemptId),
    db
      .prepare(
        `INSERT INTO card_review_log (
          id, user_id, card_id, attempt_id, rating, is_correct,
          previous_ease_factor, new_ease_factor,
          previous_interval_days, new_interval_days,
          previous_due_at, new_due_at, reviewed_at
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM attempts WHERE id = ?)`,
      )
      .bind(
        reviewId,
        user.id,
        state.card_id,
        attemptId,
        rating,
        isCorrect ? 1 : 0,
        previousState.easeFactor,
        nextState.easeFactor,
        previousState.intervalDays,
        nextState.intervalDays,
        previousState.dueAt,
        nextState.dueAt,
        nowIso,
        attemptId,
      ),
    db
      .prepare(
        `INSERT INTO xp_ledger (
          id, user_id, attempt_id, reason, reference_id, amount, created_at
        )
        SELECT ?, ?, ?, 'attempt', ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM attempts WHERE id = ?)`,
      )
      .bind(
        ledgerId,
        user.id,
        attemptId,
        attemptId,
        xpAwarded,
        nowIso,
        attemptId,
      ),
    db
      .prepare(
        `UPDATE users SET
          xp_total = xp_total + ?, streak_days = ?, last_study_date = ?,
          updated_at = ?
        WHERE id = ? AND EXISTS (SELECT 1 FROM attempts WHERE id = ?)`,
      )
      .bind(xpAwarded, nextStreak, today, nowIso, user.id, attemptId),
    db
      .prepare(
        `INSERT INTO user_topic_estimates (
          id, user_id, topic_id, attempt_count, correct_count,
          distinct_questions, mastery, coverage, opportunity,
          confidence_count, confidence_sum, brier_sum, calibration, updated_at
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM attempts WHERE id = ?)
        ON CONFLICT(user_id, topic_id) DO UPDATE SET
          attempt_count = excluded.attempt_count,
          correct_count = excluded.correct_count,
          distinct_questions = excluded.distinct_questions,
          mastery = excluded.mastery,
          coverage = excluded.coverage,
          opportunity = excluded.opportunity,
          confidence_count = excluded.confidence_count,
          confidence_sum = excluded.confidence_sum,
          brier_sum = excluded.brier_sum,
          calibration = excluded.calibration,
          updated_at = excluded.updated_at`,
      )
      .bind(
        estimateId,
        user.id,
        question.topic_id,
        nextEstimate.attemptCount,
        nextEstimate.correctCount,
        nextEstimate.distinctQuestions,
        nextEstimate.mastery,
        nextEstimate.coverage,
        nextEstimate.opportunity,
        nextEstimate.confidenceCount,
        nextEstimate.confidenceSum,
        nextEstimate.brierSum,
        nextEstimate.calibration,
        nowIso,
        attemptId,
      ),
  ]);

  // A racing retry has a different generated id and all guarded batch writes
  // become no-ops. Read back the winner to give both callers the same result.
  const persisted = await db
    .prepare(
      `SELECT id FROM attempts
       WHERE user_id = ? AND client_attempt_id = ?`,
    )
    .bind(user.id, input.clientAttemptId)
    .first<{ id: string }>();
  if (!persisted) throw new Error("The attempt could not be saved.");
  if (persisted.id !== attemptId) {
    return {
      idempotent: true,
      result: await readAttemptResult(db, user.id, persisted.id, []),
    };
  }

  const unlocked = await unlockAchievements(db, user.id, nowIso);
  return {
    idempotent: false,
    result: await readAttemptResult(db, user.id, attemptId, unlocked),
  };
}

async function getQuestion(
  db: D1Database,
  userId: string,
  questionId: string,
): Promise<QuestionRow | null> {
  return db
    .prepare(
      `SELECT
        q.id, q.topic_id, q.answer, q.explanation, q.difficulty,
        t.importance_weight,
        (SELECT COUNT(*) FROM questions q2
          WHERE q2.topic_id = q.topic_id AND q2.is_active = 1
            AND (q2.created_by_user_id IS NULL OR q2.created_by_user_id = ?)
        ) AS question_count
       FROM questions q
       JOIN topics t ON t.id = q.topic_id
       WHERE q.id = ? AND q.is_active = 1
         AND (q.created_by_user_id IS NULL OR q.created_by_user_id = ?)
       LIMIT 1`,
    )
    .bind(userId, questionId, userId)
    .first<QuestionRow>();
}

async function getAliases(db: D1Database, questionId: string): Promise<string[]> {
  const result = await db
    .prepare(
      "SELECT alias FROM question_aliases WHERE question_id = ? ORDER BY alias",
    )
    .bind(questionId)
    .all<{ alias: string }>();
  return result.results.map((row) => row.alias);
}

async function ensureCardState(
  db: D1Database,
  userId: string,
  questionId: string,
  now: Date,
): Promise<StateRow> {
  const nowIso = now.toISOString();
  const cardId = makeId("card");
  await db
    .prepare(
      `INSERT INTO study_cards (
        id, user_id, question_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'new', ?, ?)
      ON CONFLICT(user_id, question_id) DO NOTHING`,
    )
    .bind(cardId, userId, questionId, nowIso, nowIso)
    .run();
  const card = await db
    .prepare(
      `SELECT id FROM study_cards WHERE user_id = ? AND question_id = ?`,
    )
    .bind(userId, questionId)
    .first<{ id: string }>();
  if (!card) throw new Error("Unable to create a study card.");

  const initial = initialSchedulerState(now);
  await db
    .prepare(
      `INSERT INTO card_scheduler_state (
        id, card_id, user_id, ease_factor, interval_days, repetitions,
        lapses, due_at, last_reviewed_at, last_rating, scheduler_version,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
      ON CONFLICT(card_id) DO NOTHING`,
    )
    .bind(
      makeId("state"),
      card.id,
      userId,
      initial.easeFactor,
      initial.intervalDays,
      initial.repetitions,
      initial.lapses,
      initial.dueAt,
      SCHEDULER_VERSION,
      nowIso,
      nowIso,
    )
    .run();
  const state = await db
    .prepare(
      `SELECT
        sc.id AS card_id, sc.status, css.ease_factor, css.interval_days,
        css.repetitions, css.lapses, css.due_at, css.last_reviewed_at,
        css.last_rating
       FROM study_cards sc
       JOIN card_scheduler_state css ON css.card_id = sc.id
       WHERE sc.id = ?`,
    )
    .bind(card.id)
    .first<StateRow>();
  if (!state) throw new Error("Unable to initialize the card scheduler.");
  return state;
}

async function getEstimate(
  db: D1Database,
  userId: string,
  topicId: string,
): Promise<EstimateRow | null> {
  return db
    .prepare(
      `SELECT
        id, attempt_count, correct_count, distinct_questions,
        confidence_count, confidence_sum, brier_sum
       FROM user_topic_estimates WHERE user_id = ? AND topic_id = ?`,
    )
    .bind(userId, topicId)
    .first<EstimateRow>();
}

function calculateEstimate(input: {
  previous: EstimateRow | null;
  correct: boolean;
  confidence: Confidence;
  confidenceProvided: boolean;
  firstQuestionAttempt: boolean;
  questionCount: number;
  importanceWeight: number;
}) {
  const attemptCount = Number(input.previous?.attempt_count ?? 0) + 1;
  const correctCount =
    Number(input.previous?.correct_count ?? 0) + (input.correct ? 1 : 0);
  const distinctQuestions =
    Number(input.previous?.distinct_questions ?? 0) +
    (input.firstQuestionAttempt ? 1 : 0);
  const coverage = clamp(distinctQuestions / Math.max(1, input.questionCount));
  const posteriorAccuracy = (correctCount + 1) / (attemptCount + 2);
  const mastery = clamp(
    posteriorAccuracy * (0.35 + 0.65 * Math.sqrt(coverage)),
  );
  const opportunity = clamp(
    input.importanceWeight *
      (1 - mastery) *
      (0.65 + 0.35 * (1 - coverage)),
  );
  const probability = confidenceValue(input.confidence);
  const confidenceCount =
    Number(input.previous?.confidence_count ?? 0) +
    (input.confidenceProvided ? 1 : 0);
  const confidenceSum =
    Number(input.previous?.confidence_sum ?? 0) +
    (input.confidenceProvided ? probability : 0);
  const brierSum =
    Number(input.previous?.brier_sum ?? 0) +
    (input.confidenceProvided
      ? (probability - (input.correct ? 1 : 0)) ** 2
      : 0);
  return {
    attemptCount,
    correctCount,
    distinctQuestions,
    coverage: round(coverage, 6),
    mastery: round(mastery, 6),
    opportunity: round(opportunity * 100, 3),
    confidenceCount,
    confidenceSum: round(confidenceSum, 6),
    brierSum: round(brierSum, 6),
    calibration:
      confidenceCount > 0
        ? round(clamp(1 - brierSum / confidenceCount), 6)
        : 0,
  };
}

function calculateXp(
  isCorrect: boolean,
  difficulty: number,
  rating: SchedulerRating,
  responseMs: number | undefined,
  hintUsed: boolean,
): number {
  if (!isCorrect) return 2;
  const ratingBonus = { again: 0, hard: 1, good: 3, easy: 6 }[rating];
  const speedBonus =
    responseMs !== undefined && responseMs <= 5_000
      ? 3
      : responseMs !== undefined && responseMs <= 12_000
        ? 1
        : 0;
  return Math.max(
    2,
    8 + Math.max(1, Math.min(5, difficulty)) * 4 + ratingBonus + speedBonus -
      (hintUsed ? 3 : 0),
  );
}

function inferRating(
  isCorrect: boolean,
  responseMs: number | undefined,
): SchedulerRating {
  if (!isCorrect) return "again";
  return responseMs !== undefined && responseMs <= 5_000 ? "easy" : "good";
}

function confidenceValue(confidence: Confidence): number {
  return { low: 0.4, medium: 0.65, high: 0.85 }[confidence];
}

function calculateStreak(
  lastStudyDate: string | null,
  currentStreak: number,
  today: string,
): number {
  if (lastStudyDate === today) return Math.max(1, currentStreak);
  if (lastStudyDate === addUtcDays(today, -1)) return Math.max(1, currentStreak) + 1;
  return 1;
}

async function unlockAchievements(
  db: D1Database,
  userId: string,
  nowIso: string,
): Promise<AchievementDTO[]> {
  const unlocked: AchievementDTO[] = [];

  // A reward may cross the XP threshold for a second achievement, so evaluate
  // until a pass yields nothing (bounded by the small achievement catalog).
  for (let pass = 0; pass < 3; pass += 1) {
    const metrics = await getAchievementMetrics(db, userId);
    const candidates = await db
      .prepare(
        `SELECT
          a.id, a.slug, a.name, a.description, a.icon, a.metric,
          a.threshold, a.xp_reward
         FROM achievements a
         LEFT JOIN user_achievements ua
           ON ua.achievement_id = a.id AND ua.user_id = ?
         WHERE ua.id IS NULL
         ORDER BY a.threshold ASC, a.id ASC`,
      )
      .bind(userId)
      .all<{
        id: string;
        slug: string;
        name: string;
        description: string;
        icon: string;
        metric: "attempts" | "correct" | "topics" | "streak" | "xp";
        threshold: number;
        xp_reward: number;
      }>();
    let insertedThisPass = 0;
    for (const achievement of candidates.results) {
      if (metrics[achievement.metric] < Number(achievement.threshold)) continue;
      const userAchievementId = makeId("uach");
      const inserted = await db
        .prepare(
          `INSERT INTO user_achievements (
            id, user_id, achievement_id, unlocked_at
          ) VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, achievement_id) DO NOTHING
          RETURNING id`,
        )
        .bind(userAchievementId, userId, achievement.id, nowIso)
        .first<{ id: string }>();
      if (!inserted) continue;
      insertedThisPass += 1;
      const reward = Number(achievement.xp_reward);
      if (reward > 0) {
        await db.batch([
          db
            .prepare(
              `INSERT INTO xp_ledger (
                id, user_id, attempt_id, reason, reference_id, amount, created_at
              ) VALUES (?, ?, NULL, 'achievement', ?, ?, ?)
              ON CONFLICT(user_id, reason, reference_id) DO NOTHING`,
            )
            .bind(makeId("xp"), userId, userAchievementId, reward, nowIso),
          db
            .prepare(
              `UPDATE users SET xp_total = xp_total + ?, updated_at = ?
               WHERE id = ?`,
            )
            .bind(reward, nowIso, userId),
        ]);
      }
      unlocked.push({
        id: achievement.id,
        slug: achievement.slug,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        progress: Number(achievement.threshold),
        threshold: Number(achievement.threshold),
        xpReward: reward,
        unlocked: true,
        unlockedAt: nowIso,
      });
    }
    if (insertedThisPass === 0) break;
  }
  return unlocked;
}

async function getAchievementMetrics(db: D1Database, userId: string) {
  const row = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM attempts WHERE user_id = ?) AS attempts,
        (SELECT COUNT(*) FROM attempts WHERE user_id = ? AND is_correct = 1) AS correct,
        (SELECT COUNT(DISTINCT q.topic_id)
          FROM attempts a JOIN questions q ON q.id = a.question_id
          WHERE a.user_id = ?) AS topics,
        u.streak_days AS streak,
        u.xp_total AS xp
       FROM users u WHERE u.id = ?`,
    )
    .bind(userId, userId, userId, userId)
    .first<{
      attempts: number;
      correct: number;
      topics: number;
      streak: number;
      xp: number;
    }>();
  return {
    attempts: Number(row?.attempts ?? 0),
    correct: Number(row?.correct ?? 0),
    topics: Number(row?.topics ?? 0),
    streak: Number(row?.streak ?? 0),
    xp: Number(row?.xp ?? 0),
  };
}

async function readAttemptResult(
  db: D1Database,
  userId: string,
  attemptId: string,
  unlockedAchievements: AchievementDTO[],
): Promise<AttemptResult> {
  const row = await db
    .prepare(
      `SELECT
        a.id, a.question_id, a.is_correct, a.match_type, a.rating,
        a.confidence, a.confidence_provided, a.hint_used, a.xp_awarded,
        q.answer, q.explanation, q.topic_id,
        sc.id AS card_id, sc.status, css.due_at, css.interval_days,
        css.ease_factor, css.repetitions, css.lapses,
        ute.mastery, ute.coverage, ute.opportunity,
        ute.attempt_count, ute.correct_count, ute.confidence_count,
        ute.confidence_sum, ute.calibration,
        u.xp_total, u.streak_days
       FROM attempts a
       JOIN questions q ON q.id = a.question_id
       JOIN study_cards sc ON sc.id = a.card_id
       JOIN card_scheduler_state css ON css.card_id = sc.id
       JOIN users u ON u.id = a.user_id
       LEFT JOIN user_topic_estimates ute
         ON ute.user_id = a.user_id AND ute.topic_id = q.topic_id
       WHERE a.id = ? AND a.user_id = ?`,
    )
    .bind(attemptId, userId)
    .first<{
      id: string;
      question_id: string;
      is_correct: number;
      match_type: AttemptResult["matchType"];
      rating: SchedulerRating;
      confidence: Confidence;
      confidence_provided: number;
      hint_used: number;
      xp_awarded: number;
      answer: string;
      explanation: string;
      topic_id: string;
      card_id: string;
      status: CardStatus;
      due_at: string;
      interval_days: number;
      ease_factor: number;
      repetitions: number;
      lapses: number;
      mastery: number | null;
      coverage: number | null;
      opportunity: number | null;
      attempt_count: number | null;
      correct_count: number | null;
      confidence_count: number | null;
      confidence_sum: number | null;
      calibration: number | null;
      xp_total: number;
      streak_days: number;
    }>();
  if (!row) throw new Error("Saved attempt could not be read.");
  const aliases = await getAliases(db, row.question_id);
  const attempts = Number(row.attempt_count ?? 0);
  const confidenceCount = Number(row.confidence_count ?? 0);
  return {
    attemptId: row.id,
    questionId: row.question_id,
    isCorrect: Boolean(row.is_correct),
    matchType: row.match_type,
    correctAnswer: row.answer,
    acceptedAnswers: aliases.length > 0 ? aliases : [row.answer],
    explanation: row.explanation,
    rating: row.rating,
    confidence: row.confidence,
    confidenceProvided: Boolean(row.confidence_provided),
    hintUsed: Boolean(row.hint_used),
    xpAwarded: Number(row.xp_awarded),
    totalXp: Number(row.xp_total),
    level: levelFromXp(Number(row.xp_total)).level,
    streakDays: Number(row.streak_days),
    scheduler: {
      cardId: row.card_id,
      status: row.status,
      dueAt: row.due_at,
      intervalDays: Number(row.interval_days),
      easeFactor: Number(row.ease_factor),
      repetitions: Number(row.repetitions),
      lapses: Number(row.lapses),
    },
    topicEstimate: {
      topicId: row.topic_id,
      mastery: round(Number(row.mastery ?? 0)),
      coverage: round(Number(row.coverage ?? 0)),
      opportunity: round(Number(row.opportunity ?? 0), 1),
      accuracy:
        attempts > 0
          ? round(Number(row.correct_count ?? 0) / attempts)
          : 0,
      meanConfidence:
        confidenceCount > 0
          ? round(Number(row.confidence_sum ?? 0) / confidenceCount)
          : 0,
      calibration: round(Number(row.calibration ?? 0)),
    },
    unlockedAchievements,
  };
}
