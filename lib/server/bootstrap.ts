import { getD1 } from "@/db";
import { SCHEDULER_RATINGS, SCHEDULER_VERSION } from "@/lib/scheduler";
import type { RequestUser } from "@/lib/server/auth";
import {
  getDiagnosticQuestions,
  getDueQuestions,
  getNewQuestions,
} from "@/lib/server/questions";
import type {
  AchievementDTO,
  BootstrapResponse,
  RecentAttemptDTO,
  TopicSummaryDTO,
} from "@/lib/server/types";
import {
  clamp,
  levelFromXp,
  round,
  utcDayBoundsInTimeZone,
} from "@/lib/server/utils";

export async function buildBootstrap(
  user: RequestUser,
  now = new Date(),
): Promise<BootstrapResponse> {
  const db = getD1();
  const nowIso = now.toISOString();
  const todayBounds = utcDayBoundsInTimeZone(now);

  const [due, newQuestions, pool, aggregate, topics, recentAttempts, achievements] =
    await Promise.all([
      getDueQuestions(db, user.id, nowIso, 12),
      getNewQuestions(db, user.id, 12),
      getDiagnosticQuestions(db, user.id, 60),
      getAggregate(db, user.id, nowIso, todayBounds),
      getTopics(db, user.id, nowIso),
      getRecentAttempts(db, user.id),
      getAchievements(db, user),
    ]);

  const queue = [...due, ...newQuestions].slice(0, 12);
  const level = levelFromXp(user.xpTotal);
  const totalReviews = aggregate.attempt_count;
  const accuracy =
    totalReviews > 0 ? aggregate.correct_count / totalReviews : 0;
  const goal = 10;

  return {
    profile: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      xp: user.xpTotal,
      ...level,
      streakDays: user.streakDays,
      totalReviews,
      accuracy: round(accuracy),
    },
    today: {
      dueCount: aggregate.due_count,
      newAvailableCount: aggregate.new_count,
      reviewedCount: aggregate.today_reviews,
      xpEarned: aggregate.today_xp,
      goal,
      goalProgress: clamp(aggregate.today_reviews / goal),
    },
    topics,
    session: { due, new: newQuestions, queue, pool },
    recentAttempts,
    counts: {
      questions: aggregate.question_count,
      cards: aggregate.card_count,
      due: aggregate.due_count,
      new: aggregate.new_count,
      attempts: aggregate.attempt_count,
    },
    achievements,
    scheduler: {
      version: SCHEDULER_VERSION,
      ratings: SCHEDULER_RATINGS,
    },
  };
}

type AggregateRow = {
  question_count: number;
  card_count: number;
  due_count: number;
  new_count: number;
  attempt_count: number;
  correct_count: number;
  today_reviews: number;
  today_xp: number;
};

async function getAggregate(
  db: D1Database,
  userId: string,
  nowIso: string,
  todayBounds: { start: string; end: string },
): Promise<AggregateRow> {
  const row = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM questions q
          WHERE q.is_active = 1
            AND (q.created_by_user_id IS NULL OR q.created_by_user_id = ?)
        ) AS question_count,
        (SELECT COUNT(*) FROM study_cards WHERE user_id = ?) AS card_count,
        (SELECT COUNT(*)
          FROM card_scheduler_state css
          JOIN study_cards sc ON sc.id = css.card_id
          JOIN questions q ON q.id = sc.question_id
          WHERE css.user_id = ? AND sc.status != 'suspended'
            AND q.is_active = 1 AND css.due_at <= ?
        ) AS due_count,
        (SELECT COUNT(*)
          FROM questions q
          LEFT JOIN study_cards sc
            ON sc.question_id = q.id AND sc.user_id = ?
          WHERE q.is_active = 1 AND sc.id IS NULL
            AND (q.created_by_user_id IS NULL OR q.created_by_user_id = ?)
        ) AS new_count,
        (SELECT COUNT(*) FROM attempts WHERE user_id = ?) AS attempt_count,
        (SELECT COUNT(*) FROM attempts WHERE user_id = ? AND is_correct = 1) AS correct_count,
        (SELECT COUNT(*) FROM attempts
          WHERE user_id = ? AND attempted_at >= ? AND attempted_at < ?
        ) AS today_reviews,
        (SELECT COALESCE(SUM(amount), 0) FROM xp_ledger
          WHERE user_id = ? AND created_at >= ? AND created_at < ?
        ) AS today_xp`,
    )
    .bind(
      userId,
      userId,
      userId,
      nowIso,
      userId,
      userId,
      userId,
      userId,
      userId,
      todayBounds.start,
      todayBounds.end,
      userId,
      todayBounds.start,
      todayBounds.end,
    )
    .first<AggregateRow>();

  return {
    question_count: Number(row?.question_count ?? 0),
    card_count: Number(row?.card_count ?? 0),
    due_count: Number(row?.due_count ?? 0),
    new_count: Number(row?.new_count ?? 0),
    attempt_count: Number(row?.attempt_count ?? 0),
    correct_count: Number(row?.correct_count ?? 0),
    today_reviews: Number(row?.today_reviews ?? 0),
    today_xp: Number(row?.today_xp ?? 0),
  };
}

type TopicRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: "trivia" | "studio";
  icon: string;
  accent: string;
  importance_weight: number;
  question_count: number;
  due_count: number;
  new_count: number;
  attempt_count: number | null;
  correct_count: number | null;
  mastery: number | null;
  coverage: number | null;
  opportunity: number | null;
  confidence_count: number | null;
  confidence_sum: number | null;
  calibration: number | null;
};

async function getTopics(
  db: D1Database,
  userId: string,
  nowIso: string,
): Promise<TopicSummaryDTO[]> {
  const result = await db
    .prepare(
      `SELECT
        t.id, t.slug, t.name, t.description, t.kind, t.icon, t.accent,
        t.importance_weight,
        COUNT(DISTINCT q.id) AS question_count,
        COUNT(DISTINCT CASE
          WHEN sc.id IS NOT NULL AND sc.status != 'suspended' AND css.due_at <= ?
          THEN sc.id END) AS due_count,
        COUNT(DISTINCT CASE WHEN q.id IS NOT NULL AND sc.id IS NULL THEN q.id END) AS new_count,
        ute.attempt_count,
        ute.correct_count,
        ute.mastery,
        ute.coverage,
        ute.opportunity,
        ute.confidence_count,
        ute.confidence_sum,
        ute.calibration
       FROM topics t
       LEFT JOIN questions q
         ON q.topic_id = t.id AND q.is_active = 1
         AND (q.created_by_user_id IS NULL OR q.created_by_user_id = ?)
       LEFT JOIN study_cards sc
         ON sc.question_id = q.id AND sc.user_id = ?
       LEFT JOIN card_scheduler_state css ON css.card_id = sc.id
       LEFT JOIN user_topic_estimates ute
         ON ute.topic_id = t.id AND ute.user_id = ?
       GROUP BY t.id
       ORDER BY t.sort_order ASC, t.name ASC`,
    )
    .bind(nowIso, userId, userId, userId)
    .all<TopicRow>();

  return result.results.map((row) => {
    const attempts = Number(row.attempt_count ?? 0);
    const correct = Number(row.correct_count ?? 0);
    const confidenceCount = Number(row.confidence_count ?? 0);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      kind: row.kind,
      icon: row.icon,
      accent: row.accent,
      mastery: round(Number(row.mastery ?? 0)),
      coverage: round(Number(row.coverage ?? 0)),
      opportunity: round(
        Number(row.opportunity ?? Number(row.importance_weight) * 100),
        1,
      ),
      accuracy: round(attempts > 0 ? correct / attempts : 0),
      attempted: attempts,
      correct,
      dueCount: Number(row.due_count ?? 0),
      newCount: Number(row.new_count ?? 0),
      meanConfidence: round(
        confidenceCount > 0
          ? Number(row.confidence_sum ?? 0) / confidenceCount
          : 0,
      ),
      calibration: round(Number(row.calibration ?? 0)),
    };
  });
}

async function getRecentAttempts(
  db: D1Database,
  userId: string,
): Promise<RecentAttemptDTO[]> {
  const result = await db
    .prepare(
      `SELECT
        a.id, a.question_id, t.slug AS topic_slug, q.prompt,
        a.raw_answer, q.answer AS correct_answer, a.is_correct, a.rating,
        a.confidence, a.confidence_provided, a.hint_used, a.response_ms, a.mode,
        a.xp_awarded, a.attempted_at
       FROM attempts a
       JOIN questions q ON q.id = a.question_id
       JOIN topics t ON t.id = q.topic_id
       WHERE a.user_id = ?
       ORDER BY a.attempted_at DESC, a.id DESC
       LIMIT 12`,
    )
    .bind(userId)
    .all<{
      id: string;
      question_id: string;
      topic_slug: string;
      prompt: string;
      raw_answer: string;
      correct_answer: string;
      is_correct: number;
      rating: RecentAttemptDTO["rating"];
      confidence: RecentAttemptDTO["confidence"];
      confidence_provided: number;
      hint_used: number;
      response_ms: number | null;
      mode: RecentAttemptDTO["mode"];
      xp_awarded: number;
      attempted_at: string;
    }>();

  return result.results.map((row) => ({
    id: row.id,
    questionId: row.question_id,
    topicSlug: row.topic_slug,
    prompt: row.prompt,
    rawAnswer: row.raw_answer,
    correctAnswer: row.correct_answer,
    isCorrect: Boolean(row.is_correct),
    rating: row.rating,
    confidence: row.confidence,
    confidenceProvided: Boolean(row.confidence_provided),
    hintUsed: Boolean(row.hint_used),
    responseMs: row.response_ms === null ? null : Number(row.response_ms),
    mode: row.mode,
    xpAwarded: Number(row.xp_awarded),
    attemptedAt: row.attempted_at,
  }));
}

async function getAchievements(
  db: D1Database,
  user: RequestUser,
): Promise<AchievementDTO[]> {
  const metrics = await db
    .prepare(
      `SELECT
        COUNT(*) AS attempts,
        COALESCE(SUM(is_correct), 0) AS correct,
        COUNT(DISTINCT q.topic_id) AS topics
       FROM attempts a
       JOIN questions q ON q.id = a.question_id
       WHERE a.user_id = ?`,
    )
    .bind(user.id)
    .first<{ attempts: number; correct: number; topics: number }>();
  const result = await db
    .prepare(
      `SELECT
        ach.id, ach.slug, ach.name, ach.description, ach.icon,
        ach.metric, ach.threshold, ach.xp_reward, ua.unlocked_at
       FROM achievements ach
       LEFT JOIN user_achievements ua
         ON ua.achievement_id = ach.id AND ua.user_id = ?
       ORDER BY ach.threshold ASC, ach.id ASC`,
    )
    .bind(user.id)
    .all<{
      id: string;
      slug: string;
      name: string;
      description: string;
      icon: string;
      metric: "attempts" | "correct" | "topics" | "streak" | "xp";
      threshold: number;
      xp_reward: number;
      unlocked_at: string | null;
    }>();

  const values = {
    attempts: Number(metrics?.attempts ?? 0),
    correct: Number(metrics?.correct ?? 0),
    topics: Number(metrics?.topics ?? 0),
    streak: user.streakDays,
    xp: user.xpTotal,
  };
  return result.results.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    progress: Math.min(Number(row.threshold), values[row.metric]),
    threshold: Number(row.threshold),
    xpReward: Number(row.xp_reward),
    unlocked: Boolean(row.unlocked_at),
    unlockedAt: row.unlocked_at,
  }));
}
