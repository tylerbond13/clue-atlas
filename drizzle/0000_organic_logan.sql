CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`icon` text NOT NULL,
	`metric` text NOT NULL,
	`threshold` integer NOT NULL,
	`xp_reward` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "achievements_metric_check" CHECK("achievements"."metric" IN ('attempts', 'correct', 'topics', 'streak', 'xp')),
	CONSTRAINT "achievements_threshold_check" CHECK("achievements"."threshold" > 0),
	CONSTRAINT "achievements_xp_reward_check" CHECK("achievements"."xp_reward" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_slug_unique` ON `achievements` (`slug`);--> statement-breakpoint
CREATE TABLE `app_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`card_id` text NOT NULL,
	`client_attempt_id` text NOT NULL,
	`raw_answer` text NOT NULL,
	`normalized_answer` text NOT NULL,
	`is_correct` integer NOT NULL,
	`match_type` text NOT NULL,
	`rating` text NOT NULL,
	`confidence` text DEFAULT 'medium' NOT NULL,
	`confidence_provided` integer DEFAULT false NOT NULL,
	`hint_used` integer DEFAULT false NOT NULL,
	`response_ms` integer,
	`mode` text DEFAULT 'review' NOT NULL,
	`xp_awarded` integer DEFAULT 0 NOT NULL,
	`attempted_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `study_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "attempts_match_type_check" CHECK("attempts"."match_type" IN ('canonical', 'alias', 'miss')),
	CONSTRAINT "attempts_rating_check" CHECK("attempts"."rating" IN ('again', 'hard', 'good', 'easy')),
	CONSTRAINT "attempts_confidence_check" CHECK("attempts"."confidence" IN ('low', 'medium', 'high')),
	CONSTRAINT "attempts_response_ms_check" CHECK("attempts"."response_ms" IS NULL OR "attempts"."response_ms" >= 0),
	CONSTRAINT "attempts_mode_check" CHECK("attempts"."mode" IN ('diagnostic', 'review', 'play')),
	CONSTRAINT "attempts_xp_awarded_check" CHECK("attempts"."xp_awarded" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_user_client_attempt_unique` ON `attempts` (`user_id`,`client_attempt_id`);--> statement-breakpoint
CREATE INDEX `attempts_user_time_idx` ON `attempts` (`user_id`,`attempted_at`);--> statement-breakpoint
CREATE INDEX `attempts_user_topic_question_idx` ON `attempts` (`user_id`,`question_id`);--> statement-breakpoint
CREATE TABLE `card_review_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`attempt_id` text NOT NULL,
	`rating` text NOT NULL,
	`is_correct` integer NOT NULL,
	`previous_ease_factor` real NOT NULL,
	`new_ease_factor` real NOT NULL,
	`previous_interval_days` real NOT NULL,
	`new_interval_days` real NOT NULL,
	`previous_due_at` text NOT NULL,
	`new_due_at` text NOT NULL,
	`reviewed_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `study_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "card_review_log_rating_check" CHECK("card_review_log"."rating" IN ('again', 'hard', 'good', 'easy'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_review_log_attempt_unique` ON `card_review_log` (`attempt_id`);--> statement-breakpoint
CREATE INDEX `card_review_log_user_time_idx` ON `card_review_log` (`user_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `card_review_log_card_time_idx` ON `card_review_log` (`card_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `card_scheduler_state` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`user_id` text NOT NULL,
	`ease_factor` real DEFAULT 2.5 NOT NULL,
	`interval_days` real DEFAULT 0 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`lapses` integer DEFAULT 0 NOT NULL,
	`due_at` text NOT NULL,
	`last_reviewed_at` text,
	`last_rating` text,
	`scheduler_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `study_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "card_scheduler_state_ease_check" CHECK("card_scheduler_state"."ease_factor" BETWEEN 1.3 AND 3.0),
	CONSTRAINT "card_scheduler_state_interval_check" CHECK("card_scheduler_state"."interval_days" >= 0),
	CONSTRAINT "card_scheduler_state_repetitions_check" CHECK("card_scheduler_state"."repetitions" >= 0),
	CONSTRAINT "card_scheduler_state_lapses_check" CHECK("card_scheduler_state"."lapses" >= 0),
	CONSTRAINT "card_scheduler_state_rating_check" CHECK("card_scheduler_state"."last_rating" IS NULL OR "card_scheduler_state"."last_rating" IN ('again', 'hard', 'good', 'easy'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_scheduler_state_card_unique` ON `card_scheduler_state` (`card_id`);--> statement-breakpoint
CREATE INDEX `card_scheduler_state_user_due_idx` ON `card_scheduler_state` (`user_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `knowledge_units` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`canonical_answer` text NOT NULL,
	`pavlov_cues_json` text DEFAULT '[]' NOT NULL,
	`importance` real DEFAULT 1 NOT NULL,
	`difficulty` integer DEFAULT 2 NOT NULL,
	`source_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "knowledge_units_importance_check" CHECK("knowledge_units"."importance" > 0),
	CONSTRAINT "knowledge_units_difficulty_check" CHECK("knowledge_units"."difficulty" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `knowledge_units_topic_slug_unique` ON `knowledge_units` (`topic_id`,`slug`);--> statement-breakpoint
CREATE INDEX `knowledge_units_topic_idx` ON `knowledge_units` (`topic_id`);--> statement-breakpoint
CREATE TABLE `question_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`alias` text NOT NULL,
	`normalized_alias` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `question_aliases_question_normalized_unique` ON `question_aliases` (`question_id`,`normalized_alias`);--> statement-breakpoint
CREATE INDEX `question_aliases_question_idx` ON `question_aliases` (`question_id`);--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`knowledge_unit_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`prompt` text NOT NULL,
	`answer` text NOT NULL,
	`explanation` text NOT NULL,
	`format` text DEFAULT 'short_text' NOT NULL,
	`difficulty` integer DEFAULT 2 NOT NULL,
	`value` integer DEFAULT 400 NOT NULL,
	`source_id` text,
	`is_user_created` integer DEFAULT false NOT NULL,
	`created_by_user_id` text,
	`fingerprint` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`knowledge_unit_id`) REFERENCES `knowledge_units`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "questions_format_check" CHECK("questions"."format" IN ('short_text', 'multiple_choice')),
	CONSTRAINT "questions_difficulty_check" CHECK("questions"."difficulty" BETWEEN 1 AND 5),
	CONSTRAINT "questions_value_check" CHECK("questions"."value" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `questions_owner_fingerprint_unique` ON `questions` (`created_by_user_id`,`fingerprint`);--> statement-breakpoint
CREATE INDEX `questions_topic_active_idx` ON `questions` (`topic_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `questions_knowledge_unit_idx` ON `questions` (`knowledge_unit_id`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`author` text,
	`license` text,
	`notes` text,
	`accessed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sources_url_idx` ON `sources` (`url`);--> statement-breakpoint
CREATE TABLE `study_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "study_cards_status_check" CHECK("study_cards"."status" IN ('new', 'learning', 'review', 'suspended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_cards_user_question_unique` ON `study_cards` (`user_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `study_cards_user_status_idx` ON `study_cards` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`parent_id` text,
	`kind` text NOT NULL,
	`icon` text NOT NULL,
	`accent` text NOT NULL,
	`importance_weight` real DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_core` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "topics_kind_check" CHECK("topics"."kind" IN ('trivia', 'studio')),
	CONSTRAINT "topics_importance_weight_check" CHECK("topics"."importance_weight" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topics_slug_unique` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `topics_sort_order_idx` ON `topics` (`sort_order`);--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`unlocked_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_achievements_user_achievement_unique` ON `user_achievements` (`user_id`,`achievement_id`);--> statement-breakpoint
CREATE INDEX `user_achievements_user_time_idx` ON `user_achievements` (`user_id`,`unlocked_at`);--> statement-breakpoint
CREATE TABLE `user_topic_estimates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`correct_count` integer DEFAULT 0 NOT NULL,
	`distinct_questions` integer DEFAULT 0 NOT NULL,
	`mastery` real DEFAULT 0 NOT NULL,
	`coverage` real DEFAULT 0 NOT NULL,
	`opportunity` real DEFAULT 0 NOT NULL,
	`confidence_count` integer DEFAULT 0 NOT NULL,
	`confidence_sum` real DEFAULT 0 NOT NULL,
	`brier_sum` real DEFAULT 0 NOT NULL,
	`calibration` real DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_topic_estimates_attempt_check" CHECK("user_topic_estimates"."attempt_count" >= 0),
	CONSTRAINT "user_topic_estimates_correct_check" CHECK("user_topic_estimates"."correct_count" >= 0 AND "user_topic_estimates"."correct_count" <= "user_topic_estimates"."attempt_count"),
	CONSTRAINT "user_topic_estimates_distinct_check" CHECK("user_topic_estimates"."distinct_questions" >= 0),
	CONSTRAINT "user_topic_estimates_mastery_check" CHECK("user_topic_estimates"."mastery" BETWEEN 0 AND 1),
	CONSTRAINT "user_topic_estimates_coverage_check" CHECK("user_topic_estimates"."coverage" BETWEEN 0 AND 1),
	CONSTRAINT "user_topic_estimates_opportunity_check" CHECK("user_topic_estimates"."opportunity" BETWEEN 0 AND 100),
	CONSTRAINT "user_topic_estimates_confidence_count_check" CHECK("user_topic_estimates"."confidence_count" >= 0),
	CONSTRAINT "user_topic_estimates_confidence_sum_check" CHECK("user_topic_estimates"."confidence_sum" >= 0),
	CONSTRAINT "user_topic_estimates_brier_sum_check" CHECK("user_topic_estimates"."brier_sum" >= 0),
	CONSTRAINT "user_topic_estimates_calibration_check" CHECK("user_topic_estimates"."calibration" BETWEEN 0 AND 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_topic_estimates_user_topic_unique` ON `user_topic_estimates` (`user_id`,`topic_id`);--> statement-breakpoint
CREATE INDEX `user_topic_estimates_user_opportunity_idx` ON `user_topic_estimates` (`user_id`,`opportunity`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`xp_total` integer DEFAULT 0 NOT NULL,
	`streak_days` integer DEFAULT 0 NOT NULL,
	`last_study_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "users_xp_total_check" CHECK("users"."xp_total" >= 0),
	CONSTRAINT "users_streak_days_check" CHECK("users"."streak_days" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `xp_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`attempt_id` text,
	`reason` text NOT NULL,
	`reference_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "xp_ledger_amount_check" CHECK("xp_ledger"."amount" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `xp_ledger_user_reason_reference_unique` ON `xp_ledger` (`user_id`,`reason`,`reference_id`);--> statement-breakpoint
CREATE INDEX `xp_ledger_user_time_idx` ON `xp_ledger` (`user_id`,`created_at`);