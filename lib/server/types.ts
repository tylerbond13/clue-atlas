import type { SchedulerRating } from "@/lib/scheduler";

export type Confidence = "low" | "medium" | "high";
export type AttemptMode = "diagnostic" | "review" | "play";

export type TopicSummaryDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: "trivia" | "studio";
  icon: string;
  accent: string;
  mastery: number;
  coverage: number;
  opportunity: number;
  accuracy: number;
  attempted: number;
  correct: number;
  dueCount: number;
  newCount: number;
  meanConfidence: number;
  calibration: number;
};

export type QuestionDTO = {
  id: string;
  cardId: string | null;
  topic: Pick<
    TopicSummaryDTO,
    "id" | "slug" | "name" | "icon" | "accent"
  >;
  prompt: string;
  answer: string;
  acceptedAnswers: string[];
  explanation: string;
  format: "short_text" | "multiple_choice";
  difficulty: number;
  value: number;
  pavlovCues: string[];
  status: "new" | "learning" | "review" | "suspended";
  dueAt: string | null;
};

export type RecentAttemptDTO = {
  id: string;
  questionId: string;
  topicSlug: string;
  prompt: string;
  rawAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  rating: SchedulerRating;
  confidence: Confidence;
  confidenceProvided: boolean;
  hintUsed: boolean;
  responseMs: number | null;
  mode: AttemptMode;
  xpAwarded: number;
  attemptedAt: string;
};

export type AchievementDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  threshold: number;
  xpReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type BootstrapResponse = {
  profile: {
    id: string;
    displayName: string;
    email: string;
    xp: number;
    level: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
    streakDays: number;
    totalReviews: number;
    accuracy: number;
  };
  today: {
    dueCount: number;
    newAvailableCount: number;
    reviewedCount: number;
    xpEarned: number;
    goal: number;
    goalProgress: number;
  };
  topics: TopicSummaryDTO[];
  session: {
    due: QuestionDTO[];
    new: QuestionDTO[];
    queue: QuestionDTO[];
    pool: QuestionDTO[];
  };
  recentAttempts: RecentAttemptDTO[];
  counts: {
    questions: number;
    cards: number;
    due: number;
    new: number;
    attempts: number;
  };
  achievements: AchievementDTO[];
  scheduler: {
    version: string;
    ratings: readonly SchedulerRating[];
  };
};

export type AttemptRequest = {
  clientAttemptId: string;
  questionId: string;
  answer: string;
  rating?: SchedulerRating;
  confidence?: Confidence;
  hintUsed?: boolean;
  responseMs?: number;
  mode?: AttemptMode;
};
