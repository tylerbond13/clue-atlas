import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const appMetadata = sqliteTable("app_metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Clue Atlas stores timestamps as UTC ISO-8601 strings. That keeps raw D1
 * exports readable while preserving lexical sort order.
 */
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    xpTotal: integer("xp_total").notNull().default(0),
    streakDays: integer("streak_days").notNull().default(0),
    lastStudyDate: text("last_study_date"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    check("users_xp_total_check", sql`${table.xpTotal} >= 0`),
    check("users_streak_days_check", sql`${table.streakDays} >= 0`),
  ],
);

export const topics = sqliteTable(
  "topics",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    parentId: text("parent_id").references((): AnySQLiteColumn => topics.id, {
      onDelete: "set null",
    }),
    kind: text("kind", { enum: ["trivia", "studio"] }).notNull(),
    icon: text("icon").notNull(),
    accent: text("accent").notNull(),
    importanceWeight: real("importance_weight").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    isCore: integer("is_core", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("topics_slug_unique").on(table.slug),
    index("topics_sort_order_idx").on(table.sortOrder),
    check("topics_kind_check", sql`${table.kind} IN ('trivia', 'studio')`),
    check(
      "topics_importance_weight_check",
      sql`${table.importanceWeight} > 0`,
    ),
  ],
);

export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    url: text("url"),
    author: text("author"),
    license: text("license"),
    notes: text("notes"),
    accessedAt: text("accessed_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("sources_url_idx").on(table.url)],
);

export const knowledgeUnits = sqliteTable(
  "knowledge_units",
  {
    id: text("id").primaryKey(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    canonicalAnswer: text("canonical_answer").notNull(),
    pavlovCuesJson: text("pavlov_cues_json").notNull().default("[]"),
    importance: real("importance").notNull().default(1),
    difficulty: integer("difficulty").notNull().default(2),
    sourceId: text("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("knowledge_units_topic_slug_unique").on(
      table.topicId,
      table.slug,
    ),
    index("knowledge_units_topic_idx").on(table.topicId),
    check("knowledge_units_importance_check", sql`${table.importance} > 0`),
    check(
      "knowledge_units_difficulty_check",
      sql`${table.difficulty} BETWEEN 1 AND 5`,
    ),
  ],
);

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    knowledgeUnitId: text("knowledge_unit_id")
      .notNull()
      .references(() => knowledgeUnits.id, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    answer: text("answer").notNull(),
    explanation: text("explanation").notNull(),
    format: text("format", { enum: ["short_text", "multiple_choice"] })
      .notNull()
      .default("short_text"),
    difficulty: integer("difficulty").notNull().default(2),
    value: integer("value").notNull().default(400),
    sourceId: text("source_id").references(() => sources.id, {
      onDelete: "set null",
    }),
    isUserCreated: integer("is_user_created", { mode: "boolean" })
      .notNull()
      .default(false),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    fingerprint: text("fingerprint").notNull(),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("questions_owner_fingerprint_unique").on(
      table.createdByUserId,
      table.fingerprint,
    ),
    index("questions_topic_active_idx").on(table.topicId, table.isActive),
    index("questions_knowledge_unit_idx").on(table.knowledgeUnitId),
    check(
      "questions_format_check",
      sql`${table.format} IN ('short_text', 'multiple_choice')`,
    ),
    check(
      "questions_difficulty_check",
      sql`${table.difficulty} BETWEEN 1 AND 5`,
    ),
    check("questions_value_check", sql`${table.value} > 0`),
  ],
);

export const questionAliases = sqliteTable(
  "question_aliases",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("question_aliases_question_normalized_unique").on(
      table.questionId,
      table.normalizedAlias,
    ),
    index("question_aliases_question_idx").on(table.questionId),
  ],
);

export const studyCards = sqliteTable(
  "study_cards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["new", "learning", "review", "suspended"],
    })
      .notNull()
      .default("new"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("study_cards_user_question_unique").on(
      table.userId,
      table.questionId,
    ),
    index("study_cards_user_status_idx").on(table.userId, table.status),
    check(
      "study_cards_status_check",
      sql`${table.status} IN ('new', 'learning', 'review', 'suspended')`,
    ),
  ],
);

export const cardSchedulerState = sqliteTable(
  "card_scheduler_state",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => studyCards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    easeFactor: real("ease_factor").notNull().default(2.5),
    intervalDays: real("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: text("due_at").notNull(),
    lastReviewedAt: text("last_reviewed_at"),
    lastRating: text("last_rating"),
    schedulerVersion: text("scheduler_version").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("card_scheduler_state_card_unique").on(table.cardId),
    index("card_scheduler_state_user_due_idx").on(table.userId, table.dueAt),
    check(
      "card_scheduler_state_ease_check",
      sql`${table.easeFactor} BETWEEN 1.3 AND 3.0`,
    ),
    check(
      "card_scheduler_state_interval_check",
      sql`${table.intervalDays} >= 0`,
    ),
    check(
      "card_scheduler_state_repetitions_check",
      sql`${table.repetitions} >= 0`,
    ),
    check("card_scheduler_state_lapses_check", sql`${table.lapses} >= 0`),
    check(
      "card_scheduler_state_rating_check",
      sql`${table.lastRating} IS NULL OR ${table.lastRating} IN ('again', 'hard', 'good', 'easy')`,
    ),
  ],
);

export const attempts = sqliteTable(
  "attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => studyCards.id, { onDelete: "cascade" }),
    clientAttemptId: text("client_attempt_id").notNull(),
    rawAnswer: text("raw_answer").notNull(),
    normalizedAnswer: text("normalized_answer").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    matchType: text("match_type", {
      enum: ["canonical", "alias", "miss"],
    }).notNull(),
    rating: text("rating", {
      enum: ["again", "hard", "good", "easy"],
    }).notNull(),
    confidence: text("confidence", {
      enum: ["low", "medium", "high"],
    })
      .notNull()
      .default("medium"),
    confidenceProvided: integer("confidence_provided", { mode: "boolean" })
      .notNull()
      .default(false),
    hintUsed: integer("hint_used", { mode: "boolean" })
      .notNull()
      .default(false),
    responseMs: integer("response_ms"),
    mode: text("mode", { enum: ["diagnostic", "review", "play"] })
      .notNull()
      .default("review"),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    attemptedAt: text("attempted_at").notNull(),
  },
  (table) => [
    uniqueIndex("attempts_user_client_attempt_unique").on(
      table.userId,
      table.clientAttemptId,
    ),
    index("attempts_user_time_idx").on(table.userId, table.attemptedAt),
    index("attempts_user_topic_question_idx").on(
      table.userId,
      table.questionId,
    ),
    check(
      "attempts_match_type_check",
      sql`${table.matchType} IN ('canonical', 'alias', 'miss')`,
    ),
    check(
      "attempts_rating_check",
      sql`${table.rating} IN ('again', 'hard', 'good', 'easy')`,
    ),
    check(
      "attempts_confidence_check",
      sql`${table.confidence} IN ('low', 'medium', 'high')`,
    ),
    check(
      "attempts_response_ms_check",
      sql`${table.responseMs} IS NULL OR ${table.responseMs} >= 0`,
    ),
    check(
      "attempts_mode_check",
      sql`${table.mode} IN ('diagnostic', 'review', 'play')`,
    ),
    check("attempts_xp_awarded_check", sql`${table.xpAwarded} >= 0`),
  ],
);

export const cardReviewLog = sqliteTable(
  "card_review_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => studyCards.id, { onDelete: "cascade" }),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    rating: text("rating").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    previousEaseFactor: real("previous_ease_factor").notNull(),
    newEaseFactor: real("new_ease_factor").notNull(),
    previousIntervalDays: real("previous_interval_days").notNull(),
    newIntervalDays: real("new_interval_days").notNull(),
    previousDueAt: text("previous_due_at").notNull(),
    newDueAt: text("new_due_at").notNull(),
    reviewedAt: text("reviewed_at").notNull(),
  },
  (table) => [
    uniqueIndex("card_review_log_attempt_unique").on(table.attemptId),
    index("card_review_log_user_time_idx").on(table.userId, table.reviewedAt),
    index("card_review_log_card_time_idx").on(table.cardId, table.reviewedAt),
    check(
      "card_review_log_rating_check",
      sql`${table.rating} IN ('again', 'hard', 'good', 'easy')`,
    ),
  ],
);

export const xpLedger = sqliteTable(
  "xp_ledger",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptId: text("attempt_id").references(() => attempts.id, {
      onDelete: "cascade",
    }),
    reason: text("reason").notNull(),
    referenceId: text("reference_id").notNull(),
    amount: integer("amount").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("xp_ledger_user_reason_reference_unique").on(
      table.userId,
      table.reason,
      table.referenceId,
    ),
    index("xp_ledger_user_time_idx").on(table.userId, table.createdAt),
    check("xp_ledger_amount_check", sql`${table.amount} >= 0`),
  ],
);

export const achievements = sqliteTable(
  "achievements",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    metric: text("metric", {
      enum: ["attempts", "correct", "topics", "streak", "xp"],
    }).notNull(),
    threshold: integer("threshold").notNull(),
    xpReward: integer("xp_reward").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("achievements_slug_unique").on(table.slug),
    check(
      "achievements_metric_check",
      sql`${table.metric} IN ('attempts', 'correct', 'topics', 'streak', 'xp')`,
    ),
    check("achievements_threshold_check", sql`${table.threshold} > 0`),
    check("achievements_xp_reward_check", sql`${table.xpReward} >= 0`),
  ],
);

export const userAchievements = sqliteTable(
  "user_achievements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: text("unlocked_at").notNull(),
  },
  (table) => [
    uniqueIndex("user_achievements_user_achievement_unique").on(
      table.userId,
      table.achievementId,
    ),
    index("user_achievements_user_time_idx").on(
      table.userId,
      table.unlockedAt,
    ),
  ],
);

export const userTopicEstimates = sqliteTable(
  "user_topic_estimates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    attemptCount: integer("attempt_count").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    distinctQuestions: integer("distinct_questions").notNull().default(0),
    mastery: real("mastery").notNull().default(0),
    coverage: real("coverage").notNull().default(0),
    opportunity: real("opportunity").notNull().default(0),
    confidenceCount: integer("confidence_count").notNull().default(0),
    confidenceSum: real("confidence_sum").notNull().default(0),
    brierSum: real("brier_sum").notNull().default(0),
    calibration: real("calibration").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("user_topic_estimates_user_topic_unique").on(
      table.userId,
      table.topicId,
    ),
    index("user_topic_estimates_user_opportunity_idx").on(
      table.userId,
      table.opportunity,
    ),
    check(
      "user_topic_estimates_attempt_check",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "user_topic_estimates_correct_check",
      sql`${table.correctCount} >= 0 AND ${table.correctCount} <= ${table.attemptCount}`,
    ),
    check(
      "user_topic_estimates_distinct_check",
      sql`${table.distinctQuestions} >= 0`,
    ),
    check(
      "user_topic_estimates_mastery_check",
      sql`${table.mastery} BETWEEN 0 AND 1`,
    ),
    check(
      "user_topic_estimates_coverage_check",
      sql`${table.coverage} BETWEEN 0 AND 1`,
    ),
    check(
      "user_topic_estimates_opportunity_check",
      sql`${table.opportunity} BETWEEN 0 AND 100`,
    ),
    check(
      "user_topic_estimates_confidence_count_check",
      sql`${table.confidenceCount} >= 0`,
    ),
    check(
      "user_topic_estimates_confidence_sum_check",
      sql`${table.confidenceSum} >= 0`,
    ),
    check(
      "user_topic_estimates_brier_sum_check",
      sql`${table.brierSum} >= 0`,
    ),
    check(
      "user_topic_estimates_calibration_check",
      sql`${table.calibration} BETWEEN 0 AND 1`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type KnowledgeUnit = typeof knowledgeUnits.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
