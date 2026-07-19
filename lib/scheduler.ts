/**
 * Clue Atlas scheduler v1
 * -----------------------
 * A deliberately legible, SM-2-inspired scheduler for an MVP and analytics
 * portfolio. It keeps SM-2's ease-factor and expanding-interval ideas, but
 * maps them to Anki's four familiar buttons:
 *
 * - Again: relearn in 10 minutes, reset repetitions, reduce ease.
 * - Hard:  learn/review slowly (12 hours for a new card, then ×1.2).
 * - Good:  graduate at 1 day, then 3 days, then ×ease.
 * - Easy:  graduate at 4 days, then ×ease×1.3 and increase ease.
 *
 * Ease is clamped to [1.3, 3.0], intervals to 10 minutes–3650 days. There is
 * intentionally no random "fuzz" in v1: the same state + rating + timestamp
 * always produces the same result, which makes the review log reproducible.
 */

export const SCHEDULER_VERSION = "clue-atlas-sm2-v1";

export const SCHEDULER_RATINGS = ["again", "hard", "good", "easy"] as const;
export type SchedulerRating = (typeof SCHEDULER_RATINGS)[number];
export type CardStatus = "new" | "learning" | "review" | "suspended";

export type SchedulerState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string | null;
  lastRating: SchedulerRating | null;
  status: CardStatus;
};

export type ScheduledState = SchedulerState & {
  schedulerVersion: typeof SCHEDULER_VERSION;
};

const MIN_EASE = 1.3;
const MAX_EASE = 3;
const TEN_MINUTES_IN_DAYS = 10 / (24 * 60);
const MAX_INTERVAL_DAYS = 3650;

export function initialSchedulerState(now = new Date()): ScheduledState {
  return {
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    lapses: 0,
    dueAt: now.toISOString(),
    lastReviewedAt: null,
    lastRating: null,
    status: "new",
    schedulerVersion: SCHEDULER_VERSION,
  };
}

export function scheduleCard(
  previous: SchedulerState,
  rating: SchedulerRating,
  reviewedAt = new Date(),
): ScheduledState {
  let easeFactor = previous.easeFactor;
  let intervalDays = previous.intervalDays;
  let repetitions = previous.repetitions;
  let lapses = previous.lapses;
  let status: CardStatus = "review";

  switch (rating) {
    case "again":
      easeFactor -= 0.2;
      intervalDays = TEN_MINUTES_IN_DAYS;
      repetitions = 0;
      lapses += 1;
      status = "learning";
      break;
    case "hard":
      easeFactor -= 0.15;
      intervalDays = repetitions === 0 ? 0.5 : Math.max(1, intervalDays * 1.2);
      repetitions += 1;
      status = repetitions < 2 ? "learning" : "review";
      break;
    case "good":
      intervalDays =
        repetitions === 0
          ? 1
          : repetitions === 1
            ? 3
            : intervalDays * easeFactor;
      repetitions += 1;
      status = "review";
      break;
    case "easy":
      easeFactor += 0.15;
      intervalDays =
        repetitions === 0 ? 4 : Math.max(4, intervalDays * easeFactor * 1.3);
      repetitions += 1;
      status = "review";
      break;
  }

  easeFactor = round(clamp(easeFactor, MIN_EASE, MAX_EASE), 2);
  const dueIntervalDays = clamp(
    intervalDays,
    TEN_MINUTES_IN_DAYS,
    MAX_INTERVAL_DAYS,
  );
  intervalDays = round(dueIntervalDays, 6);

  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses,
    dueAt: new Date(
      reviewedAt.getTime() + dueIntervalDays * 24 * 60 * 60 * 1000,
    ).toISOString(),
    lastReviewedAt: reviewedAt.toISOString(),
    lastRating: rating,
    status,
    schedulerVersion: SCHEDULER_VERSION,
  };
}

export function isSchedulerRating(value: unknown): value is SchedulerRating {
  return (
    typeof value === "string" &&
    (SCHEDULER_RATINGS as readonly string[]).includes(value)
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
