import { getD1 } from "@/db";
import { SCHEDULER_VERSION } from "@/lib/scheduler";
import type { RequestUser } from "@/lib/server/auth";

export type AttemptExportRow = {
  exportSchemaVersion: number;
  attemptId: string;
  clientAttemptId: string;
  attemptedAt: string;
  topicId: string;
  topicSlug: string;
  topicName: string;
  cardId: string;
  questionId: string;
  knowledgeUnitId: string;
  difficulty: number;
  value: number;
  prompt: string;
  rawAnswer: string;
  normalizedAnswer: string;
  canonicalAnswer: string;
  isCorrect: boolean;
  matchType: string;
  rating: string;
  confidence: string;
  confidenceProbability: number;
  confidenceProvided: boolean;
  hintUsed: boolean;
  responseMs: number | null;
  mode: string;
  xpAwarded: number;
  previousEaseFactor: number;
  newEaseFactor: number;
  previousIntervalDays: number;
  newIntervalDays: number;
  previousDueAt: string;
  newDueAt: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourceId: string | null;
  sourceLicense: string | null;
  schedulerVersion: string;
};

export async function getAttemptExportRows(
  userId: string,
): Promise<AttemptExportRow[]> {
  const db = getD1();
  const result = await db
    .prepare(
      `SELECT
        a.id AS attempt_id,
        a.client_attempt_id,
        a.attempted_at,
        t.id AS topic_id,
        t.slug AS topic_slug,
        t.name AS topic_name,
        a.card_id,
        q.id AS question_id,
        q.knowledge_unit_id,
        q.difficulty,
        q.value,
        q.prompt,
        a.raw_answer,
        a.normalized_answer,
        q.answer AS canonical_answer,
        a.is_correct,
        a.match_type,
        a.rating,
        a.confidence,
        a.confidence_provided,
        a.hint_used,
        a.response_ms,
        a.mode,
        a.xp_awarded,
        r.previous_ease_factor,
        r.new_ease_factor,
        r.previous_interval_days,
        r.new_interval_days,
        r.previous_due_at,
        r.new_due_at,
        s.id AS source_id,
        s.title AS source_title,
        s.url AS source_url,
        s.license AS source_license
       FROM attempts a
       JOIN questions q ON q.id = a.question_id
       JOIN topics t ON t.id = q.topic_id
       LEFT JOIN card_review_log r ON r.attempt_id = a.id
       LEFT JOIN sources s ON s.id = q.source_id
       WHERE a.user_id = ?
       ORDER BY a.attempted_at ASC, a.id ASC`,
    )
    .bind(userId)
    .all<{
      attempt_id: string;
      client_attempt_id: string;
      attempted_at: string;
      topic_id: string;
      topic_slug: string;
      topic_name: string;
      card_id: string;
      question_id: string;
      knowledge_unit_id: string;
      difficulty: number;
      value: number;
      prompt: string;
      raw_answer: string;
      normalized_answer: string;
      canonical_answer: string;
      is_correct: number;
      match_type: string;
      rating: string;
      confidence: string;
      confidence_provided: number;
      hint_used: number;
      response_ms: number | null;
      mode: string;
      xp_awarded: number;
      previous_ease_factor: number | null;
      new_ease_factor: number | null;
      previous_interval_days: number | null;
      new_interval_days: number | null;
      previous_due_at: string | null;
      new_due_at: string | null;
      source_id: string | null;
      source_title: string | null;
      source_url: string | null;
      source_license: string | null;
    }>();

  return result.results.map((row) => ({
    exportSchemaVersion: 1,
    attemptId: row.attempt_id,
    clientAttemptId: row.client_attempt_id,
    attemptedAt: row.attempted_at,
    topicId: row.topic_id,
    topicSlug: row.topic_slug,
    topicName: row.topic_name,
    cardId: row.card_id,
    questionId: row.question_id,
    knowledgeUnitId: row.knowledge_unit_id,
    difficulty: Number(row.difficulty),
    value: Number(row.value),
    prompt: row.prompt,
    rawAnswer: row.raw_answer,
    normalizedAnswer: row.normalized_answer,
    canonicalAnswer: row.canonical_answer,
    isCorrect: Boolean(row.is_correct),
    matchType: row.match_type,
    rating: row.rating,
    confidence: row.confidence,
    confidenceProbability: confidenceProbability(row.confidence),
    confidenceProvided: Boolean(row.confidence_provided),
    hintUsed: Boolean(row.hint_used),
    responseMs: row.response_ms === null ? null : Number(row.response_ms),
    mode: row.mode,
    xpAwarded: Number(row.xp_awarded),
    previousEaseFactor: Number(row.previous_ease_factor ?? 2.5),
    newEaseFactor: Number(row.new_ease_factor ?? 2.5),
    previousIntervalDays: Number(row.previous_interval_days ?? 0),
    newIntervalDays: Number(row.new_interval_days ?? 0),
    previousDueAt: row.previous_due_at ?? row.attempted_at,
    newDueAt: row.new_due_at ?? row.attempted_at,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    sourceId: row.source_id,
    sourceLicense: row.source_license,
    schedulerVersion: SCHEDULER_VERSION,
  }));
}

export function attemptsToCsv(rows: AttemptExportRow[]): string {
  const columns: Array<[keyof AttemptExportRow, string]> = [
    ["exportSchemaVersion", "export_schema_version"],
    ["schedulerVersion", "scheduler_version"],
    ["attemptId", "attempt_id"],
    ["clientAttemptId", "client_attempt_id"],
    ["attemptedAt", "attempted_at"],
    ["topicId", "topic_id"],
    ["topicSlug", "topic_slug"],
    ["topicName", "topic_name"],
    ["cardId", "card_id"],
    ["questionId", "question_id"],
    ["knowledgeUnitId", "knowledge_unit_id"],
    ["difficulty", "difficulty"],
    ["value", "clue_value"],
    ["prompt", "prompt"],
    ["rawAnswer", "raw_answer"],
    ["normalizedAnswer", "normalized_answer"],
    ["canonicalAnswer", "canonical_answer"],
    ["isCorrect", "is_correct"],
    ["matchType", "match_type"],
    ["rating", "rating"],
    ["confidence", "confidence"],
    ["confidenceProbability", "confidence_probability"],
    ["confidenceProvided", "confidence_provided"],
    ["hintUsed", "hint_used"],
    ["responseMs", "response_ms"],
    ["mode", "mode"],
    ["xpAwarded", "xp_awarded"],
    ["previousEaseFactor", "previous_ease_factor"],
    ["newEaseFactor", "new_ease_factor"],
    ["previousIntervalDays", "previous_interval_days"],
    ["newIntervalDays", "new_interval_days"],
    ["previousDueAt", "previous_due_at"],
    ["newDueAt", "new_due_at"],
    ["sourceTitle", "source_title"],
    ["sourceUrl", "source_url"],
    ["sourceId", "source_id"],
    ["sourceLicense", "source_license"],
  ];
  return [
    columns.map(([, header]) => header).join(","),
    ...rows.map((row) =>
      columns.map(([key]) => csvCell(row[key])).join(","),
    ),
  ].join("\n");
}

export function jsonExport(user: RequestUser, rows: AttemptExportRow[]) {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    schedulerVersion: SCHEDULER_VERSION,
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
    },
    confidenceScale: { low: 0.4, medium: 0.65, high: 0.85 },
    attempts: rows,
  };
}

function confidenceProbability(value: string): number {
  if (value === "low") return 0.4;
  if (value === "high") return 0.85;
  return 0.65;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
  // Neutralize spreadsheet formulas in user-entered answers and prompts.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
