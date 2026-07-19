import { getD1 } from "@/db";
import { initialSchedulerState, SCHEDULER_VERSION } from "@/lib/scheduler";
import type { RequestUser } from "@/lib/server/auth";
import { getQuestionDto } from "@/lib/server/questions";
import type { QuestionDTO } from "@/lib/server/types";
import {
  HttpError,
  normalizeAnswer,
  stableHash,
} from "@/lib/server/utils";

export type CustomQuestionInput = {
  topicId?: string;
  topicSlug?: string;
  prompt: string;
  answer: string;
  aliases: string[];
  explanation: string;
  difficulty: number;
  pavlovCues: string[];
  source?: {
    title: string;
    url: string | null;
    author: string | null;
    license: string | null;
  };
};

export async function createCustomQuestion(
  user: RequestUser,
  input: CustomQuestionInput,
  now = new Date(),
): Promise<{ question: QuestionDTO; created: boolean }> {
  const db = getD1();
  const topic = await resolveTopic(db, input.topicId, input.topicSlug);
  if (!topic) throw new HttpError(404, "Choose an available topic.");

  const normalizedPrompt = normalizeAnswer(input.prompt);
  const normalizedAnswer = normalizeAnswer(input.answer);
  if (!normalizedPrompt || !normalizedAnswer) {
    throw new HttpError(400, "Prompt and answer need searchable text.");
  }
  const fingerprint = `custom:${stableHash(`${normalizedPrompt}|${normalizedAnswer}`)}`;
  const idStem = `${stableHash(user.id)}_${stableHash(fingerprint)}`;
  const questionId = `question_custom_${idStem}`;
  const unitId = `unit_custom_${idStem}`;
  const cardId = `card_custom_${idStem}`;
  const nowIso = now.toISOString();
  const prior = await db
    .prepare(
      `SELECT id FROM questions
       WHERE created_by_user_id = ? AND fingerprint = ?`,
    )
    .bind(user.id, fingerprint)
    .first<{ id: string }>();
  const sourceId = input.source ? `source_custom_${idStem}` : null;
  const statements: D1PreparedStatement[] = [];

  if (input.source) {
    statements.push(
      db
        .prepare(
          `INSERT INTO sources (
            id, title, url, author, license, notes, accessed_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            url = excluded.url,
            author = excluded.author,
            license = excluded.license,
            accessed_at = excluded.accessed_at`,
        )
        .bind(
          sourceId,
          input.source.title,
          input.source.url,
          input.source.author,
          input.source.license,
          "Source supplied by the user who created this card.",
          nowIso,
          nowIso,
        ),
    );
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO knowledge_units (
          id, topic_id, slug, title, summary, canonical_answer,
          pavlov_cues_json, importance, difficulty, source_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          topic_id = excluded.topic_id,
          title = excluded.title,
          summary = excluded.summary,
          canonical_answer = excluded.canonical_answer,
          pavlov_cues_json = excluded.pavlov_cues_json,
          difficulty = excluded.difficulty,
          source_id = excluded.source_id,
          updated_at = excluded.updated_at`,
      )
      .bind(
        unitId,
        topic.id,
        `custom-${idStem}`,
        input.answer,
        input.explanation,
        input.answer,
        JSON.stringify(input.pavlovCues),
        input.difficulty,
        sourceId,
        nowIso,
        nowIso,
      ),
    db
      .prepare(
        `INSERT INTO questions (
          id, knowledge_unit_id, topic_id, prompt, answer, explanation,
          format, difficulty, value, source_id, is_user_created,
          created_by_user_id, fingerprint, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'short_text', ?, ?, ?, 1, ?, ?, 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          topic_id = excluded.topic_id,
          prompt = excluded.prompt,
          answer = excluded.answer,
          explanation = excluded.explanation,
          difficulty = excluded.difficulty,
          value = excluded.value,
          source_id = excluded.source_id,
          is_active = 1,
          updated_at = excluded.updated_at`,
      )
      .bind(
        questionId,
        unitId,
        topic.id,
        input.prompt,
        input.answer,
        input.explanation,
        input.difficulty,
        input.difficulty * 200,
        sourceId,
        user.id,
        fingerprint,
        nowIso,
        nowIso,
      ),
  );

  const aliases = new Map<string, string>();
  for (const alias of [input.answer, ...input.aliases]) {
    const normalized = normalizeAnswer(alias);
    if (normalized) aliases.set(normalized, alias.trim());
  }
  for (const [normalized, alias] of aliases) {
    statements.push(
      db
        .prepare(
          `INSERT INTO question_aliases (
            id, question_id, alias, normalized_alias, created_at
          ) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(question_id, normalized_alias) DO UPDATE SET
            alias = excluded.alias`,
        )
        .bind(
          `alias_${stableHash(`${questionId}:${normalized}`)}`,
          questionId,
          alias,
          normalized,
          nowIso,
        ),
    );
  }
  const initial = initialSchedulerState(now);
  statements.push(
    db
      .prepare(
        `INSERT INTO study_cards (
          id, user_id, question_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'new', ?, ?)
        ON CONFLICT(user_id, question_id) DO NOTHING`,
      )
      .bind(cardId, user.id, questionId, nowIso, nowIso),
    db
      .prepare(
        `INSERT INTO card_scheduler_state (
          id, card_id, user_id, ease_factor, interval_days, repetitions,
          lapses, due_at, last_reviewed_at, last_rating, scheduler_version,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, 0, ?, NULL, NULL, ?, ?, ?)
        ON CONFLICT(card_id) DO NOTHING`,
      )
      .bind(
        `state_custom_${idStem}`,
        cardId,
        user.id,
        initial.easeFactor,
        initial.intervalDays,
        initial.dueAt,
        SCHEDULER_VERSION,
        nowIso,
        nowIso,
      ),
  );

  await db.batch(statements);
  const question = await getQuestionDto(db, user.id, questionId);
  if (!question) throw new Error("The custom question could not be read.");
  return { question, created: !prior };
}

async function resolveTopic(
  db: D1Database,
  topicId: string | undefined,
  topicSlug: string | undefined,
): Promise<{ id: string } | null> {
  if (topicId) {
    return db
      .prepare("SELECT id FROM topics WHERE id = ? LIMIT 1")
      .bind(topicId)
      .first<{ id: string }>();
  }
  if (topicSlug) {
    return db
      .prepare("SELECT id FROM topics WHERE slug = ? LIMIT 1")
      .bind(topicSlug)
      .first<{ id: string }>();
  }
  return null;
}
