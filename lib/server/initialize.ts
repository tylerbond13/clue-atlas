import { getD1 } from "@/db";
import {
  SEED_ACHIEVEMENTS,
  SEED_QUESTIONS,
  SEED_SOURCES,
  SEED_TOPICS,
} from "@/lib/seed-content";
import { SCHEDULER_VERSION } from "@/lib/scheduler";
import { normalizeAnswer, stableHash } from "@/lib/server/utils";

const CATALOG_VERSION = "clue-atlas-catalog-v1";
const SCHEMA_VERSION = "clue-atlas-schema-v1";
const SEED_TIMESTAMP = "2026-07-19T00:00:00.000Z";

let initializationPromise: Promise<void> | null = null;

/**
 * D1's `exec()` splits multiline input, so every table and index is created by
 * its own prepared statement. The global promise avoids repeating the work in
 * a warm Worker isolate; all DDL and seed inserts remain idempotent.
 */
export function ensureDatabase(): Promise<void> {
  initializationPromise ??= initialize(getD1()).catch((error) => {
    initializationPromise = null;
    throw error;
  });
  return initializationPromise;
}

async function initialize(db: D1Database): Promise<void> {
  // The metadata table is the one inexpensive statement every cold isolate
  // runs. A schema marker avoids dozens of redundant DDL round trips after the
  // database has been initialized successfully once.
  await db.prepare(CREATE_TABLE_STATEMENTS[0]).run();
  const currentSchema = await db
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .bind("schema_version")
    .first<{ value: string }>();
  if (currentSchema?.value !== SCHEMA_VERSION) {
    for (const statement of CREATE_TABLE_STATEMENTS.slice(1)) {
      await db.prepare(statement).run();
    }
    await ensureAdditiveColumns(db);
    for (const statement of CREATE_INDEX_STATEMENTS) {
      await db.prepare(statement).run();
    }
    await db
      .prepare(
        `INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
      )
      .bind("schema_version", SCHEMA_VERSION, SEED_TIMESTAMP)
      .run();
  }

  const currentCatalog = await db
    .prepare("SELECT value FROM app_metadata WHERE key = ?")
    .bind("catalog_version")
    .first<{ value: string }>();
  if (currentCatalog?.value === CATALOG_VERSION) return;

  await seedCatalog(db);
}

async function ensureAdditiveColumns(db: D1Database): Promise<void> {
  // Runtime initialization also tolerates an earlier local preview database.
  // Each ALTER remains one prepared statement and only runs when PRAGMA shows
  // the column is absent. Hosted schema evolution will use generated migrations.
  await ensureColumns(db, "attempts", [
    {
      name: "confidence",
      sql: "ALTER TABLE attempts ADD COLUMN confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high'))",
    },
    {
      name: "confidence_provided",
      sql: "ALTER TABLE attempts ADD COLUMN confidence_provided INTEGER NOT NULL DEFAULT 0 CHECK (confidence_provided IN (0, 1))",
    },
    {
      name: "hint_used",
      sql: "ALTER TABLE attempts ADD COLUMN hint_used INTEGER NOT NULL DEFAULT 0 CHECK (hint_used IN (0, 1))",
    },
  ]);
  await ensureColumns(db, "user_topic_estimates", [
    {
      name: "confidence_count",
      sql: "ALTER TABLE user_topic_estimates ADD COLUMN confidence_count INTEGER NOT NULL DEFAULT 0 CHECK (confidence_count >= 0)",
    },
    {
      name: "confidence_sum",
      sql: "ALTER TABLE user_topic_estimates ADD COLUMN confidence_sum REAL NOT NULL DEFAULT 0 CHECK (confidence_sum >= 0)",
    },
    {
      name: "brier_sum",
      sql: "ALTER TABLE user_topic_estimates ADD COLUMN brier_sum REAL NOT NULL DEFAULT 0 CHECK (brier_sum >= 0)",
    },
    {
      name: "calibration",
      sql: "ALTER TABLE user_topic_estimates ADD COLUMN calibration REAL NOT NULL DEFAULT 0 CHECK (calibration BETWEEN 0 AND 1)",
    },
  ]);
}

async function ensureColumns(
  db: D1Database,
  table: string,
  columns: ReadonlyArray<{ name: string; sql: string }>,
): Promise<void> {
  const result = await db
    .prepare(`PRAGMA table_info(${table})`)
    .all<{ name: string }>();
  const existing = new Set(result.results.map((row) => row.name));
  for (const column of columns) {
    if (!existing.has(column.name)) await db.prepare(column.sql).run();
  }
}

async function seedCatalog(db: D1Database): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  for (const source of SEED_SOURCES) {
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
            notes = excluded.notes`,
        )
        .bind(
          source.id,
          source.title,
          source.url,
          source.author,
          source.license,
          source.notes,
          SEED_TIMESTAMP,
          SEED_TIMESTAMP,
        ),
    );
  }

  for (const topic of SEED_TOPICS) {
    statements.push(
      db
        .prepare(
          `INSERT INTO topics (
            id, slug, name, description, parent_id, kind, icon, accent,
            importance_weight, sort_order, is_core, created_at, updated_at
          ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            slug = excluded.slug,
            name = excluded.name,
            description = excluded.description,
            kind = excluded.kind,
            icon = excluded.icon,
            accent = excluded.accent,
            importance_weight = excluded.importance_weight,
            sort_order = excluded.sort_order,
            is_core = excluded.is_core,
            updated_at = excluded.updated_at`,
        )
        .bind(
          topic.id,
          topic.slug,
          topic.name,
          topic.description,
          topic.kind,
          topic.icon,
          topic.accent,
          topic.importanceWeight,
          topic.sortOrder,
          topic.isCore ? 1 : 0,
          SEED_TIMESTAMP,
          SEED_TIMESTAMP,
        ),
    );
  }

  const topicIds = new Map(SEED_TOPICS.map((topic) => [topic.slug, topic.id]));
  for (const question of SEED_QUESTIONS) {
    const topicId = topicIds.get(question.topicSlug);
    if (!topicId) throw new Error(`Unknown seed topic: ${question.topicSlug}`);

    statements.push(
      db
        .prepare(
          `INSERT INTO knowledge_units (
            id, topic_id, slug, title, summary, canonical_answer,
            pavlov_cues_json, importance, difficulty, source_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            topic_id = excluded.topic_id,
            slug = excluded.slug,
            title = excluded.title,
            summary = excluded.summary,
            canonical_answer = excluded.canonical_answer,
            pavlov_cues_json = excluded.pavlov_cues_json,
            importance = excluded.importance,
            difficulty = excluded.difficulty,
            updated_at = excluded.updated_at`,
        )
        .bind(
          question.unitId,
          topicId,
          question.unitSlug,
          question.answer,
          question.explanation,
          question.answer,
          JSON.stringify(question.pavlovCues),
          question.importance,
          question.difficulty,
          "source-clue-atlas-original-v1",
          SEED_TIMESTAMP,
          SEED_TIMESTAMP,
        ),
    );
    statements.push(
      db
        .prepare(
          `INSERT INTO questions (
            id, knowledge_unit_id, topic_id, prompt, answer, explanation,
            format, difficulty, value, source_id, is_user_created,
            created_by_user_id, fingerprint, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'short_text', ?, ?, ?, 0, NULL, ?, 1, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            knowledge_unit_id = excluded.knowledge_unit_id,
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
          question.id,
          question.unitId,
          topicId,
          question.prompt,
          question.answer,
          question.explanation,
          question.difficulty,
          question.value,
          "source-clue-atlas-original-v1",
          `seed:${question.id}`,
          SEED_TIMESTAMP,
          SEED_TIMESTAMP,
        ),
    );

    const aliases = new Map<string, string>();
    for (const alias of [question.answer, ...question.aliases]) {
      const normalized = normalizeAnswer(alias);
      if (normalized) aliases.set(normalized, alias);
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
            `alias_${stableHash(`${question.id}:${normalized}`)}`,
            question.id,
            alias,
            normalized,
            SEED_TIMESTAMP,
          ),
      );
    }
  }

  for (const achievement of SEED_ACHIEVEMENTS) {
    statements.push(
      db
        .prepare(
          `INSERT INTO achievements (
            id, slug, name, description, icon, metric, threshold,
            xp_reward, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            slug = excluded.slug,
            name = excluded.name,
            description = excluded.description,
            icon = excluded.icon,
            metric = excluded.metric,
            threshold = excluded.threshold,
            xp_reward = excluded.xp_reward`,
        )
        .bind(
          achievement.id,
          achievement.slug,
          achievement.name,
          achievement.description,
          achievement.icon,
          achievement.metric,
          achievement.threshold,
          achievement.xpReward,
          SEED_TIMESTAMP,
        ),
    );
  }

  statements.push(
    db
      .prepare(
        `INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
      )
      .bind("catalog_version", CATALOG_VERSION, SEED_TIMESTAMP),
    db
      .prepare(
        `INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
      )
      .bind("scheduler_version", SCHEDULER_VERSION, SEED_TIMESTAMP),
  );

  // D1 batches are transactional and have a statement-count limit; chunks are
  // safe because every write is an idempotent upsert and the marker is last.
  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50));
  }
}

const CREATE_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    xp_total INTEGER NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
    streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    last_study_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    parent_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('trivia', 'studio')),
    icon TEXT NOT NULL,
    accent TEXT NOT NULL,
    importance_weight REAL NOT NULL DEFAULT 1 CHECK (importance_weight > 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_core INTEGER NOT NULL DEFAULT 0 CHECK (is_core IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    author TEXT,
    license TEXT,
    notes TEXT,
    accessed_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS knowledge_units (
    id TEXT PRIMARY KEY NOT NULL,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    canonical_answer TEXT NOT NULL,
    pavlov_cues_json TEXT NOT NULL DEFAULT '[]',
    importance REAL NOT NULL DEFAULT 1 CHECK (importance > 0),
    difficulty INTEGER NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
    source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY NOT NULL,
    knowledge_unit_id TEXT NOT NULL REFERENCES knowledge_units(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'short_text' CHECK (format IN ('short_text', 'multiple_choice')),
    difficulty INTEGER NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
    value INTEGER NOT NULL DEFAULT 400 CHECK (value > 0),
    source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
    is_user_created INTEGER NOT NULL DEFAULT 0 CHECK (is_user_created IN (0, 1)),
    created_by_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS question_aliases (
    id TEXT PRIMARY KEY NOT NULL,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    normalized_alias TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS study_cards (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'review', 'suspended')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS card_scheduler_state (
    id TEXT PRIMARY KEY NOT NULL,
    card_id TEXT NOT NULL REFERENCES study_cards(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ease_factor REAL NOT NULL DEFAULT 2.5 CHECK (ease_factor BETWEEN 1.3 AND 3.0),
    interval_days REAL NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
    repetitions INTEGER NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
    lapses INTEGER NOT NULL DEFAULT 0 CHECK (lapses >= 0),
    due_at TEXT NOT NULL,
    last_reviewed_at TEXT,
    last_rating TEXT CHECK (last_rating IS NULL OR last_rating IN ('again', 'hard', 'good', 'easy')),
    scheduler_version TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL REFERENCES study_cards(id) ON DELETE CASCADE,
    client_attempt_id TEXT NOT NULL,
    raw_answer TEXT NOT NULL,
    normalized_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
    match_type TEXT NOT NULL CHECK (match_type IN ('canonical', 'alias', 'miss')),
    rating TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
    confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),
    confidence_provided INTEGER NOT NULL DEFAULT 0 CHECK (confidence_provided IN (0, 1)),
    hint_used INTEGER NOT NULL DEFAULT 0 CHECK (hint_used IN (0, 1)),
    response_ms INTEGER CHECK (response_ms IS NULL OR response_ms >= 0),
    mode TEXT NOT NULL DEFAULT 'review' CHECK (mode IN ('diagnostic', 'review', 'play')),
    xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
    attempted_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS card_review_log (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL REFERENCES study_cards(id) ON DELETE CASCADE,
    attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    rating TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
    is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
    previous_ease_factor REAL NOT NULL,
    new_ease_factor REAL NOT NULL,
    previous_interval_days REAL NOT NULL,
    new_interval_days REAL NOT NULL,
    previous_due_at TEXT NOT NULL,
    new_due_at TEXT NOT NULL,
    reviewed_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS xp_ledger (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_id TEXT REFERENCES attempts(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    metric TEXT NOT NULL CHECK (metric IN ('attempts', 'correct', 'topics', 'streak', 'xp')),
    threshold INTEGER NOT NULL CHECK (threshold > 0),
    xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS user_topic_estimates (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0 AND correct_count <= attempt_count),
    distinct_questions INTEGER NOT NULL DEFAULT 0 CHECK (distinct_questions >= 0),
    mastery REAL NOT NULL DEFAULT 0 CHECK (mastery BETWEEN 0 AND 1),
    coverage REAL NOT NULL DEFAULT 0 CHECK (coverage BETWEEN 0 AND 1),
    opportunity REAL NOT NULL DEFAULT 0 CHECK (opportunity BETWEEN 0 AND 100),
    confidence_count INTEGER NOT NULL DEFAULT 0 CHECK (confidence_count >= 0),
    confidence_sum REAL NOT NULL DEFAULT 0 CHECK (confidence_sum >= 0),
    brier_sum REAL NOT NULL DEFAULT 0 CHECK (brier_sum >= 0),
    calibration REAL NOT NULL DEFAULT 0 CHECK (calibration BETWEEN 0 AND 1),
    updated_at TEXT NOT NULL
  )`,
] as const;

const CREATE_INDEX_STATEMENTS = [
  "CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email)",
  "CREATE UNIQUE INDEX IF NOT EXISTS topics_slug_unique ON topics(slug)",
  "CREATE INDEX IF NOT EXISTS topics_sort_order_idx ON topics(sort_order)",
  "CREATE INDEX IF NOT EXISTS sources_url_idx ON sources(url)",
  "CREATE UNIQUE INDEX IF NOT EXISTS knowledge_units_topic_slug_unique ON knowledge_units(topic_id, slug)",
  "CREATE INDEX IF NOT EXISTS knowledge_units_topic_idx ON knowledge_units(topic_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS questions_owner_fingerprint_unique ON questions(created_by_user_id, fingerprint)",
  "CREATE INDEX IF NOT EXISTS questions_topic_active_idx ON questions(topic_id, is_active)",
  "CREATE INDEX IF NOT EXISTS questions_knowledge_unit_idx ON questions(knowledge_unit_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS question_aliases_question_normalized_unique ON question_aliases(question_id, normalized_alias)",
  "CREATE INDEX IF NOT EXISTS question_aliases_question_idx ON question_aliases(question_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS study_cards_user_question_unique ON study_cards(user_id, question_id)",
  "CREATE INDEX IF NOT EXISTS study_cards_user_status_idx ON study_cards(user_id, status)",
  "CREATE UNIQUE INDEX IF NOT EXISTS card_scheduler_state_card_unique ON card_scheduler_state(card_id)",
  "CREATE INDEX IF NOT EXISTS card_scheduler_state_user_due_idx ON card_scheduler_state(user_id, due_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS attempts_user_client_attempt_unique ON attempts(user_id, client_attempt_id)",
  "CREATE INDEX IF NOT EXISTS attempts_user_time_idx ON attempts(user_id, attempted_at)",
  "CREATE INDEX IF NOT EXISTS attempts_user_topic_question_idx ON attempts(user_id, question_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS card_review_log_attempt_unique ON card_review_log(attempt_id)",
  "CREATE INDEX IF NOT EXISTS card_review_log_user_time_idx ON card_review_log(user_id, reviewed_at)",
  "CREATE INDEX IF NOT EXISTS card_review_log_card_time_idx ON card_review_log(card_id, reviewed_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS xp_ledger_user_reason_reference_unique ON xp_ledger(user_id, reason, reference_id)",
  "CREATE INDEX IF NOT EXISTS xp_ledger_user_time_idx ON xp_ledger(user_id, created_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS achievements_slug_unique ON achievements(slug)",
  "CREATE UNIQUE INDEX IF NOT EXISTS user_achievements_user_achievement_unique ON user_achievements(user_id, achievement_id)",
  "CREATE INDEX IF NOT EXISTS user_achievements_user_time_idx ON user_achievements(user_id, unlocked_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS user_topic_estimates_user_topic_unique ON user_topic_estimates(user_id, topic_id)",
  "CREATE INDEX IF NOT EXISTS user_topic_estimates_user_opportunity_idx ON user_topic_estimates(user_id, opportunity)",
] as const;
