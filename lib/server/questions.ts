import type { QuestionDTO } from "@/lib/server/types";
import { parseJsonArray } from "@/lib/server/utils";

type QuestionRow = {
  id: string;
  card_id: string | null;
  topic_id: string;
  topic_slug: string;
  topic_name: string;
  topic_icon: string;
  topic_accent: string;
  prompt: string;
  answer: string;
  explanation: string;
  format: "short_text" | "multiple_choice";
  difficulty: number;
  value: number;
  pavlov_cues_json: string;
  status: "new" | "learning" | "review" | "suspended" | null;
  due_at: string | null;
};

const QUESTION_COLUMNS = `
  q.id,
  sc.id AS card_id,
  t.id AS topic_id,
  t.slug AS topic_slug,
  t.name AS topic_name,
  t.icon AS topic_icon,
  t.accent AS topic_accent,
  q.prompt,
  q.answer,
  q.explanation,
  q.format,
  q.difficulty,
  q.value,
  ku.pavlov_cues_json,
  sc.status,
  css.due_at
`;

export async function getDueQuestions(
  db: D1Database,
  userId: string,
  now: string,
  limit = 12,
): Promise<QuestionDTO[]> {
  const result = await db
    .prepare(
      `SELECT ${QUESTION_COLUMNS}
       FROM study_cards sc
       JOIN card_scheduler_state css ON css.card_id = sc.id
       JOIN questions q ON q.id = sc.question_id
       JOIN knowledge_units ku ON ku.id = q.knowledge_unit_id
       JOIN topics t ON t.id = q.topic_id
       WHERE sc.user_id = ?
         AND sc.status != 'suspended'
         AND q.is_active = 1
         AND css.due_at <= ?
       ORDER BY css.due_at ASC, ku.importance DESC, q.id ASC
       LIMIT ?`,
    )
    .bind(userId, now, limit)
    .all<QuestionRow>();
  return hydrateQuestions(db, result.results);
}

export async function getNewQuestions(
  db: D1Database,
  userId: string,
  limit = 12,
): Promise<QuestionDTO[]> {
  const result = await db
    .prepare(
      `SELECT ${QUESTION_COLUMNS}
       FROM questions q
       JOIN knowledge_units ku ON ku.id = q.knowledge_unit_id
       JOIN topics t ON t.id = q.topic_id
       LEFT JOIN study_cards sc
         ON sc.question_id = q.id AND sc.user_id = ?
       LEFT JOIN card_scheduler_state css ON css.card_id = sc.id
       LEFT JOIN user_topic_estimates ute
         ON ute.topic_id = q.topic_id AND ute.user_id = ?
       WHERE q.is_active = 1
         AND sc.id IS NULL
         AND (q.created_by_user_id IS NULL OR q.created_by_user_id = ?)
       ORDER BY
         COALESCE(ute.opportunity, t.importance_weight * 100) DESC,
         ku.importance DESC,
         t.sort_order ASC,
         q.id ASC
       LIMIT ?`,
    )
    .bind(userId, userId, userId, limit)
    .all<QuestionRow>();
  return hydrateQuestions(db, result.results);
}

/** A broad, topic-ordered pool for diagnostics and focused practice. */
export async function getDiagnosticQuestions(
  db: D1Database,
  userId: string,
  limit = 60,
): Promise<QuestionDTO[]> {
  const result = await db
    .prepare(
      `SELECT ${QUESTION_COLUMNS}
       FROM questions q
       JOIN knowledge_units ku ON ku.id = q.knowledge_unit_id
       JOIN topics t ON t.id = q.topic_id
       LEFT JOIN study_cards sc
         ON sc.question_id = q.id AND sc.user_id = ?
       LEFT JOIN card_scheduler_state css ON css.card_id = sc.id
       WHERE q.is_active = 1
         AND (q.created_by_user_id IS NULL OR q.created_by_user_id = ?)
       ORDER BY t.sort_order ASC, q.difficulty ASC, ku.importance DESC, q.id ASC
       LIMIT ?`,
    )
    .bind(userId, userId, limit)
    .all<QuestionRow>();
  return hydrateQuestions(db, result.results);
}

export async function getQuestionDto(
  db: D1Database,
  userId: string,
  questionId: string,
): Promise<QuestionDTO | null> {
  const row = await db
    .prepare(
      `SELECT ${QUESTION_COLUMNS}
       FROM questions q
       JOIN knowledge_units ku ON ku.id = q.knowledge_unit_id
       JOIN topics t ON t.id = q.topic_id
       LEFT JOIN study_cards sc
         ON sc.question_id = q.id AND sc.user_id = ?
       LEFT JOIN card_scheduler_state css ON css.card_id = sc.id
       WHERE q.id = ?
         AND q.is_active = 1
         AND (q.created_by_user_id IS NULL OR q.created_by_user_id = ?)
       LIMIT 1`,
    )
    .bind(userId, questionId, userId)
    .first<QuestionRow>();
  if (!row) return null;
  const [question] = await hydrateQuestions(db, [row]);
  return question ?? null;
}

async function hydrateQuestions(
  db: D1Database,
  rows: QuestionRow[],
): Promise<QuestionDTO[]> {
  if (rows.length === 0) return [];
  const uniqueIds = [...new Set(rows.map((row) => row.id))];
  const placeholders = uniqueIds.map(() => "?").join(", ");
  const aliasResult = await db
    .prepare(
      `SELECT question_id, alias
       FROM question_aliases
       WHERE question_id IN (${placeholders})
       ORDER BY question_id, alias`,
    )
    .bind(...uniqueIds)
    .all<{ question_id: string; alias: string }>();
  const aliases = new Map<string, string[]>();
  for (const row of aliasResult.results) {
    const list = aliases.get(row.question_id) ?? [];
    list.push(row.alias);
    aliases.set(row.question_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    cardId: row.card_id,
    topic: {
      id: row.topic_id,
      slug: row.topic_slug,
      name: row.topic_name,
      icon: row.topic_icon,
      accent: row.topic_accent,
    },
    prompt: row.prompt,
    answer: row.answer,
    acceptedAnswers: aliases.get(row.id) ?? [row.answer],
    explanation: row.explanation,
    format: row.format,
    difficulty: Number(row.difficulty),
    value: Number(row.value),
    pavlovCues: parseJsonArray(row.pavlov_cues_json),
    status: row.status ?? "new",
    dueAt: row.due_at,
  }));
}
