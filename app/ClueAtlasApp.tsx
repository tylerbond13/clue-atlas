"use client";

import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type View = "today" | "learn" | "play" | "map" | "studio" | "data";
type Mode = "diagnostic" | "review" | "play";
type Rating = "again" | "hard" | "good" | "easy";
type Confidence = "low" | "medium" | "high";

type Topic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
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
};

type Question = {
  id: string;
  cardId: string | null;
  topic: Pick<Topic, "id" | "slug" | "name" | "icon" | "accent">;
  prompt: string;
  answer: string;
  acceptedAnswers: string[];
  explanation: string;
  format: string;
  difficulty: number;
  value: number;
  pavlovCues: string[];
  status: string;
  dueAt: number | string | null;
};

type RecentAttempt = {
  id: string;
  topicName: string;
  prompt: string;
  answer: string;
  correctAnswer: string;
  isCorrect: boolean;
  confidence?: Confidence;
  confidenceProvided?: boolean;
  responseMs: number;
  occurredAt: number;
};

type Bootstrap = {
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
  topics: Topic[];
  session: { due: Question[]; new: Question[]; queue: Question[]; pool?: Question[] };
  recentAttempts: RecentAttempt[];
  counts: { questions: number; cards: number; due: number; new: number; attempts: number };
  achievements: Array<{ id: string; name: string; description: string; icon: string; unlockedAt?: number }>;
  scheduler: { version: string; ratings: Record<Rating, string> };
};

type SessionResult = {
  topic: string;
  correct: boolean;
  confidence: Confidence;
};

const TOPICS: Topic[] = [
  ["geography", "Geography", "Countries, capitals, rivers, landmarks, and the spatial links that unlock other categories.", "core", "GE", "#6657e8", 62, 48, 88],
  ["history-civics", "History & Civics", "Presidents, revolutions, empires, documents, leaders, and turning points.", "core", "HI", "#f06049", 48, 39, 94],
  ["science-nature", "Science & Nature", "Biology, chemistry, physics, medicine, earth, space, plants, and animals.", "core", "SC", "#48a887", 71, 53, 66],
  ["literature-language", "Literature & Language", "Authors, titles, characters, poetry, vocabulary, and etymology.", "core", "LI", "#d5962f", 44, 36, 86],
  ["arts-myth", "Arts, Myth & Religion", "Painters, composers, theater, world religions, and classical mythology.", "core", "AR", "#9b62c7", 31, 24, 98],
  ["screen-sound", "Screen & Sound", "Film, television, popular music, performers, awards, and decade anchors.", "core", "PO", "#ed6d88", 77, 65, 52],
  ["sports-games", "Sports & Games", "Leagues, rules, championships, Olympics, athletes, and tabletop classics.", "core", "SP", "#297fa8", 55, 42, 68],
  ["food-life", "Food, Drink & Life", "Cuisines, cocktails, ingredients, travel, fashion, and everyday culture.", "core", "FO", "#ca784a", 69, 50, 58],
  ["wordplay", "Wordplay", "Before & After, common bonds, roots, anagrams, quotations, and clue mechanics.", "core", "WO", "#7c78bd", 38, 29, 84],
  ["statistics", "Statistics", "Probability, distributions, inference, experiments, and calibrated uncertainty.", "studio", "ST", "#3f9d80", 57, 41, 73],
  ["data-science", "Data Science & ML", "Modeling, evaluation, leakage, features, experimentation, and reproducibility.", "studio", "DS", "#4a74c9", 63, 46, 64],
  ["data-engineering", "Data Engineering", "SQL, warehouses, pipelines, orchestration, quality, and lineage.", "studio", "DE", "#d05d65", 46, 34, 81],
].map(([slug, name, description, kind, icon, accent, mastery, coverage, opportunity], index) => ({
  id: `topic-${index + 1}`,
  slug: String(slug),
  name: String(name),
  description: String(description),
  kind: String(kind),
  icon: String(icon),
  accent: String(accent),
  mastery: Number(mastery),
  coverage: Number(coverage),
  opportunity: Number(opportunity),
  accuracy: Number(mastery),
  attempted: 4 + index,
  correct: Math.round((4 + index) * Number(mastery) / 100),
  dueCount: (index % 3) + 1,
  newCount: 3,
}));

const QUESTION_SEEDS: Array<[string, string, string, string[], string, number, string[]]> = [
  ["geography", "This river flows through Vienna, Bratislava, Budapest, and Belgrade before reaching the Black Sea.", "Danube", ["the Danube", "Danube River"], "The Danube crosses or borders ten countries—more than any other river in the world.", 2, ["Vienna", "Budapest", "Black Sea"]],
  ["history-civics", "Signed in 1215, this charter forced England’s King John to accept limits on royal power.", "Magna Carta", ["the Magna Carta"], "Magna Carta became an enduring symbol of the principle that rulers are subject to law.", 2, ["1215", "King John", "royal power"]],
  ["science-nature", "With atomic number 79, this element uses the chemical symbol Au.", "Gold", ["Au"], "Au comes from the Latin aurum. Gold has 79 protons in its nucleus.", 1, ["79", "Au", "aurum"]],
  ["literature-language", "The fictional counties of Yoknapatawpha and Jefferson are central to works by this American novelist.", "William Faulkner", ["Faulkner"], "Faulkner set many novels and stories in his invented Mississippi county.", 3, ["Yoknapatawpha", "Mississippi", "Jefferson"]],
  ["arts-myth", "The owl and the olive tree are traditional symbols of this Greek goddess.", "Athena", ["Pallas Athena"], "Athena is associated with wisdom, strategy, and the city that bears her name.", 2, ["owl", "olive tree", "wisdom"]],
  ["screen-sound", "Miles Davis released this landmark modal jazz album in 1959.", "Kind of Blue", ["Kind of Blue by Miles Davis"], "Featuring John Coltrane and Bill Evans, it became one of jazz’s most celebrated records.", 2, ["Miles Davis", "1959", "modal jazz"]],
  ["sports-games", "In baseball, the distance between consecutive bases is this many feet.", "90 feet", ["ninety feet", "90"], "The standard Major League Baseball diamond uses 90-foot basepaths.", 1, ["baseball", "bases", "feet"]],
  ["food-life", "Gin, sweet vermouth, and Campari make up this classic Italian aperitivo cocktail.", "Negroni", ["a Negroni"], "The Negroni is traditionally equal parts gin, sweet vermouth, and Campari.", 2, ["gin", "Campari", "sweet vermouth"]],
  ["wordplay", "A word formed by blending parts of two other words—like smog—is known by this term.", "Portmanteau", ["a portmanteau", "portmanteau word"], "Lewis Carroll popularized the linguistic sense of portmanteau in Through the Looking-Glass.", 2, ["blend", "smog", "Lewis Carroll"]],
  ["statistics", "Rejecting a true null hypothesis is this kind of error.", "Type I error", ["type one error", "false positive"], "A Type I error is a false positive; its long-run rate is controlled by alpha.", 2, ["reject true null", "false positive", "alpha"]],
  ["data-science", "When information from the target or future accidentally enters model training, it creates this problem.", "Data leakage", ["target leakage", "leakage"], "Leakage makes validation performance look better than real-world performance.", 2, ["future information", "target", "validation"]],
  ["data-engineering", "This warehouse schema places one fact table at the center, directly surrounded by denormalized dimensions.", "Star schema", ["a star schema"], "Star schemas simplify analytical joins and make the grain of a fact table explicit.", 2, ["fact table", "dimensions", "warehouse"]],
  ["geography", "Cusco was the historic capital of this South American empire.", "Inca Empire", ["the Inca", "Incan Empire"], "Cusco was the political and religious center of the Inca Empire.", 2, ["Cusco", "Andes", "South America"]],
  ["history-civics", "Hamilton, Madison, and Jay used this collective pen name for the Federalist Papers.", "Publius", ["Publius"], "The three authors argued for ratification of the U.S. Constitution under the name Publius.", 3, ["Hamilton", "Madison", "Jay"]],
  ["science-nature", "These laws describe planetary orbits as ellipses and relate orbital period to distance from the Sun.", "Kepler’s laws", ["Kepler's laws of planetary motion", "Kepler laws"], "Johannes Kepler formulated three laws of planetary motion from astronomical observations.", 3, ["ellipses", "orbital period", "Sun"]],
  ["literature-language", "This Colombian author wrote One Hundred Years of Solitude.", "Gabriel García Márquez", ["Gabriel Garcia Marquez", "García Márquez", "Marquez"], "The novel is a landmark of magical realism and follows the Buendía family.", 1, ["Colombia", "Macondo", "magical realism"]],
  ["arts-myth", "Picasso painted this monumental anti-war work after the bombing of a Basque town.", "Guernica", ["Guernica by Picasso"], "The black-and-white painting was created for the 1937 Paris International Exposition.", 2, ["Picasso", "Basque", "anti-war"]],
  ["statistics", "This theorem explains why sample means tend toward a normal distribution as sample size grows.", "Central Limit Theorem", ["the CLT", "CLT"], "Under broad conditions, standardized sums or means converge in distribution toward the normal law.", 2, ["sample means", "normal distribution", "sample size"]],
];

const FALLBACK_QUESTIONS: Question[] = QUESTION_SEEDS.map((seed, index) => {
  const [slug, prompt, answer, aliases, explanation, difficulty, cues] = seed;
  const topic = TOPICS.find((item) => item.slug === slug) ?? TOPICS[0];
  return {
    id: `demo-question-${index + 1}`,
    cardId: null,
    topic: { id: topic.id, slug: topic.slug, name: topic.name, icon: topic.icon, accent: topic.accent },
    prompt,
    answer,
    acceptedAnswers: [answer, ...aliases],
    explanation,
    format: "free_recall",
    difficulty,
    value: difficulty * 200,
    pavlovCues: cues,
    status: "new",
    dueAt: null,
  };
});

const FALLBACK: Bootstrap = {
  profile: { id: "demo", displayName: "Explorer", email: "", xp: 1280, level: 4, xpIntoLevel: 180, xpForNextLevel: 400, streakDays: 7, totalReviews: 46, accuracy: 64 },
  today: { dueCount: 9, newAvailableCount: 18, reviewedCount: 3, xpEarned: 45, goal: 12, goalProgress: 25 },
  topics: TOPICS,
  session: { due: FALLBACK_QUESTIONS.slice(0, 7), new: FALLBACK_QUESTIONS.slice(7), queue: FALLBACK_QUESTIONS, pool: FALLBACK_QUESTIONS },
  recentAttempts: [],
  counts: { questions: FALLBACK_QUESTIONS.length, cards: FALLBACK_QUESTIONS.length, due: 9, new: 18, attempts: 46 },
  achievements: [
    { id: "first-signal", name: "Signal Finder", description: "Recognized a recurring clue signal.", icon: "SF", unlockedAt: Date.now() },
    { id: "seven-day", name: "Seven-Day Atlas", description: "Kept the knowledge ember glowing for a week.", icon: "7D", unlockedAt: Date.now() },
  ],
  scheduler: { version: "Clue Atlas SM-2 v1", ratings: { again: "1 min", hard: "1 day", good: "4 days", easy: "9 days" } },
};

const NAV: Array<{ id: View; label: string; mark: string }> = [
  { id: "today", label: "Today", mark: "01" },
  { id: "learn", label: "Learn", mark: "02" },
  { id: "play", label: "Play", mark: "03" },
  { id: "map", label: "Knowledge Map", mark: "04" },
  { id: "studio", label: "Studio", mark: "05" },
  { id: "data", label: "Data Lab", mark: "06" },
];

function normalizeAnswer(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/^(?:what|who|where)\s+(?:is|are|was|were)\s+/, "")
    .replace(/^(?:a|an|the)\s+/, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isAnswerCorrect(input: string, question: Question) {
  const normalized = normalizeAnswer(input);
  return question.acceptedAnswers.some((answer) => normalizeAnswer(answer) === normalized);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function asPercent(value: number) {
  return clampPercent(value <= 1 ? value * 100 : value);
}

function topicMonogram(name: string) {
  const words = name.replace(/&/g, " ").split(/\s+/).filter((word) => word.length > 2);
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return name.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase();
}

function normalizeBootstrap(raw: Bootstrap): Bootstrap {
  const topics = raw.topics.map((topic) => ({
    ...topic,
    kind: topic.kind === "technical" ? "studio" : topic.kind,
    icon: topicMonogram(topic.name),
    mastery: asPercent(topic.mastery),
    coverage: asPercent(topic.coverage),
    accuracy: asPercent(topic.accuracy),
  }));
  const topicNames = new Map(topics.map((topic) => [topic.slug, topic.name]));
  const recentAttempts = (raw.recentAttempts as Array<RecentAttempt & {
    topicSlug?: string;
    rawAnswer?: string;
    attemptedAt?: string;
  }>).map((attempt) => ({
    ...attempt,
    topicName: attempt.topicName ?? topicNames.get(attempt.topicSlug ?? "") ?? "Uncategorized",
    answer: attempt.answer ?? attempt.rawAnswer ?? "",
    occurredAt: attempt.occurredAt ?? (attempt.attemptedAt ? Date.parse(attempt.attemptedAt) : Date.now()),
  }));
  const normalizeQuestion = (question: Question): Question => ({
    ...question,
    topic: { ...question.topic, icon: topicMonogram(question.topic.name) },
  });
  const ratingLabels: Record<Rating, string> = {
    again: "1 min",
    hard: "1 day",
    good: "4 days",
    easy: "9 days",
  };

  return {
    ...raw,
    profile: { ...raw.profile, accuracy: asPercent(raw.profile.accuracy) },
    today: { ...raw.today, goalProgress: asPercent(raw.today.goalProgress) },
    topics,
    session: {
      due: raw.session.due.map(normalizeQuestion),
      new: raw.session.new.map(normalizeQuestion),
      queue: raw.session.queue.map(normalizeQuestion),
      pool: raw.session.pool?.map(normalizeQuestion),
    },
    recentAttempts,
    scheduler: { version: raw.scheduler.version, ratings: ratingLabels },
  };
}

function accentStyle(accent: string) {
  return { "--card-accent": accent } as CSSProperties;
}

export default function ClueAtlasApp() {
  const [view, setView] = useState<View>("today");
  const [data, setData] = useState<Bootstrap>(FALLBACK);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ mode: Mode; title: string; questions: Question[]; index: number; results: SessionResult[] } | null>(null);
  const [completion, setCompletion] = useState<{ mode: Mode; title: string; results: SessionResult[] } | null>(null);
  const [draft, setDraft] = useState("");
  const [confidence, setConfidence] = useState<Confidence>("medium");
  const [revealed, setRevealed] = useState(false);
  const [localCorrect, setLocalCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [studioForm, setStudioForm] = useState({ topicSlug: "statistics", prompt: "", answer: "", aliases: "", explanation: "", cues: "" });
  const questionStartedAt = useRef(Date.now());
  const answerResponseMs = useRef(0);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!response.ok) throw new Error("bootstrap unavailable");
      const next = normalizeBootstrap((await response.json()) as Bootstrap);
      setData(next);
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/bootstrap", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("bootstrap unavailable");
        return response.json() as Promise<Bootstrap>;
      })
      .then((next) => {
        setData(normalizeBootstrap(next));
        setConnected(true);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setConnected(false);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const currentQuestion = session?.questions[session.index] ?? null;

  useEffect(() => {
    if (!session || !revealed || session.mode === "diagnostic") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const ratings: Rating[] = ["again", "hard", "good", "easy"];
      const rating = ratings[Number(event.key) - 1];
      if (rating) void finishReview(rating);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const bestGap = useMemo(
    () => [...data.topics].sort((a, b) => b.opportunity - a.opportunity)[0] ?? TOPICS[0],
    [data.topics],
  );

  function resetQuestion() {
    setDraft("");
    setConfidence("medium");
    setRevealed(false);
    setLocalCorrect(false);
    setSubmitting(false);
    questionStartedAt.current = Date.now();
    answerResponseMs.current = 0;
  }

  function startSession(mode: Mode, topic?: Topic) {
    const connectedPool = [...(data.session.pool ?? []), ...data.session.queue, ...data.session.due, ...data.session.new]
      .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index);
    const pool = connected && connectedPool.length ? connectedPool : FALLBACK_QUESTIONS;
    let questions = pool;
    let title = "Daily Circuit";

    if (mode === "diagnostic") {
      const byTopic = new Map<string, Question>();
      pool.forEach((question) => {
        if (!byTopic.has(question.topic.slug)) byTopic.set(question.topic.slug, question);
      });
      questions = [...byTopic.values(), ...pool].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 12);
      title = "Placement Sprint";
    } else if (topic) {
      const focused = pool.filter((question) => question.topic.slug === topic.slug);
      questions = (focused.length >= 3 ? focused : [...focused, ...pool]).slice(0, 8);
      title = `${topic.name} Gap Sprint`;
    } else if (mode === "play") {
      questions = [...pool].sort((a, b) => a.difficulty - b.difficulty).slice(0, 10);
      title = "Board Rush";
    } else {
      questions = [...data.session.due, ...data.session.new, ...pool]
        .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
        .slice(0, 10);
    }

    if (!questions.length) questions = FALLBACK_QUESTIONS.slice(0, 10);
    setCompletion(null);
    setSession({ mode, title, questions, index: 0, results: [] });
    resetQuestion();
  }

  function leaveSession() {
    if (session && currentQuestion && revealed) {
      void recordAttempt(currentQuestion, localCorrect ? "good" : "again").finally(loadData);
    }
    setSession(null);
    resetQuestion();
  }

  async function recordAttempt(question: Question, rating?: Rating) {
    const payload = {
      clientAttemptId: crypto.randomUUID(),
      questionId: question.id,
      answer: draft,
      rating,
      responseMs: Math.max(250, answerResponseMs.current || Date.now() - questionStartedAt.current),
      confidence,
      mode: session?.mode ?? "review",
    };

    try {
      const response = await fetch("/api/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("attempt unavailable");
      const body = (await response.json()) as { result?: { isCorrect: boolean; xpAwarded: number; totalXp: number; level: number; unlockedAchievements?: Array<{ name: string }> } };
      if (body.result) {
        setData((current) => ({
          ...current,
          profile: { ...current.profile, xp: body.result!.totalXp, level: body.result!.level },
          today: { ...current.today, reviewedCount: current.today.reviewedCount + 1, xpEarned: current.today.xpEarned + body.result!.xpAwarded },
        }));
        if (body.result.unlockedAchievements?.length) {
          setToast(`Stamp unlocked: ${body.result.unlockedAchievements[0].name}`);
        }
      }
      return body.result?.isCorrect ?? isAnswerCorrect(draft, question);
    } catch {
      return isAnswerCorrect(draft, question);
    }
  }

  function advanceSession(correct: boolean) {
    if (!session || !currentQuestion) return;
    const nextResults = [...session.results, { topic: currentQuestion.topic.name, correct, confidence }];
    if (session.index >= session.questions.length - 1) {
      setCompletion({ mode: session.mode, title: session.title, results: nextResults });
      setSession(null);
      resetQuestion();
      void loadData();
      return;
    }
    setSession({ ...session, index: session.index + 1, results: nextResults });
    resetQuestion();
  }

  async function submitAnswer(event?: FormEvent) {
    event?.preventDefault();
    if (!session || !currentQuestion || !draft.trim() || submitting) return;
    answerResponseMs.current = Date.now() - questionStartedAt.current;
    const correct = isAnswerCorrect(draft, currentQuestion);

    if (session.mode === "diagnostic") {
      setSubmitting(true);
      const serverCorrect = await recordAttempt(currentQuestion);
      advanceSession(serverCorrect);
      return;
    }

    setLocalCorrect(correct);
    setRevealed(true);
  }

  async function finishReview(rating: Rating) {
    if (!session || !currentQuestion || submitting) return;
    setSubmitting(true);
    const correct = await recordAttempt(currentQuestion, rating);
    advanceSession(correct);
  }

  async function addQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studioForm.prompt.trim() || !studioForm.answer.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topicSlug: studioForm.topicSlug,
          prompt: studioForm.prompt,
          answer: studioForm.answer,
          aliases: studioForm.aliases.split(",").map((item) => item.trim()).filter(Boolean),
          explanation: studioForm.explanation,
          pavlovCues: studioForm.cues.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      const responseBody = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(responseBody.error ?? "Could not save this card.");
      setStudioForm((current) => ({ ...current, prompt: "", answer: "", aliases: "", explanation: "", cues: "" }));
      setToast("Card added to your atlas.");
      await loadData();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save this card.");
    } finally {
      setSubmitting(false);
    }
  }

  function navigate(next: View) {
    setView(next);
    setCompletion(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="atlas-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate("today")} aria-label="Clue Atlas home">
          <span className="brand-mark" aria-hidden="true"><i /><b>CA</b></span>
          <span><strong>Clue Atlas</strong><small>personal knowledge gym</small></span>
        </button>
        <nav className="desktop-nav" aria-label="Primary">
          {NAV.map((item) => (
            <button key={item.id} type="button" className={view === item.id ? "active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => navigate(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="profile-strip">
          <span className="streak-pill" title="Current streak"><i aria-hidden="true">✦</i>{data.profile.streakDays}</span>
          <span className="xp-pill"><b>{data.profile.xp.toLocaleString()}</b><small>XP</small></span>
          <span className="avatar" aria-label={`${data.profile.displayName}, level ${data.profile.level}`}>{data.profile.displayName.slice(0, 1).toUpperCase()}</span>
        </div>
      </header>

      {session ? (
        <StudySession
          session={session}
          question={currentQuestion!}
          draft={draft}
          confidence={confidence}
          revealed={revealed}
          correct={localCorrect}
          submitting={submitting}
          onDraft={setDraft}
          onConfidence={setConfidence}
          onSubmit={submitAnswer}
          onRate={finishReview}
          onLeave={leaveSession}
        />
      ) : completion ? (
        <CompletionScreen completion={completion} onDone={() => { setCompletion(null); setView(completion.mode === "diagnostic" ? "map" : "today"); }} onAgain={() => startSession(completion.mode)} />
      ) : (
        <main id="main-content">
          {view === "today" && <TodayView data={data} loading={loading} connected={connected} bestGap={bestGap} onStart={() => startSession("review")} onDiagnostic={() => startSession("diagnostic")} onGap={() => startSession("review", bestGap)} onNavigate={navigate} />}
          {view === "learn" && <LearnView topics={data.topics} bestGap={bestGap} onStart={(topic) => startSession("review", topic)} />}
          {view === "play" && <PlayView topics={data.topics} onStart={(topic) => startSession("play", topic)} onDaily={() => startSession("review")} />}
          {view === "map" && <MapView topics={data.topics} onStart={(topic) => startSession("review", topic)} />}
          {view === "studio" && <StudioView topics={data.topics} form={studioForm} setForm={setStudioForm} onSubmit={addQuestion} submitting={submitting} />}
          {view === "data" && <DataLabView data={data} connected={connected} />}
        </main>
      )}

      {!session && !completion && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {NAV.map((item) => (
            <button key={item.id} type="button" className={view === item.id ? "active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => navigate(item.id)}>
              <span>{item.mark}</span>{item.label.replace("Knowledge ", "")}
            </button>
          ))}
        </nav>
      )}
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

function TodayView({ data, loading, connected, bestGap, onStart, onDiagnostic, onGap, onNavigate }: { data: Bootstrap; loading: boolean; connected: boolean; bestGap: Topic; onStart: () => void; onDiagnostic: () => void; onGap: () => void; onNavigate: (view: View) => void }) {
  const mastery = data.topics.length ? Math.round(data.topics.reduce((sum, item) => sum + item.mastery, 0) / data.topics.length) : 0;
  return (
    <div className="page-wrap today-page">
      <section className="welcome-line">
        <div>
          <p className="eyebrow"><span /> Today’s expedition</p>
          <h1>Know more.<br /><em>Know what to learn next.</em></h1>
          <p className="lede">Clue Atlas turns every answer, miss, hesitation, and lucky guess into a smarter path through trivia—and your own technical curriculum.</p>
        </div>
        <div className="live-note" aria-live="polite">
          <span className={connected ? "connected" : ""} />
          {loading ? "Opening the archive…" : connected ? "Learning record synced" : "Preview data · database reconnecting"}
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="next-session ink-card">
          <div className="card-kicker"><span>Next best session</span><b>12 min</b></div>
          <div className="session-orbit" aria-hidden="true">
            <div className="orbit-ring"><span>{data.today.dueCount}</span><small>due</small></div>
            <i className="orbit-dot one" /><i className="orbit-dot two" /><i className="orbit-dot three" />
          </div>
          <h2>Today’s Circuit</h2>
          <p>{data.today.dueCount} memories ready for another pass, 3 fresh signals, and one pressure round.</p>
          <div className="circuit-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={clampPercent(data.today.goalProgress)} aria-label="Daily goal progress">
            <span style={{ width: `${clampPercent(data.today.goalProgress)}%` }} />
          </div>
          <div className="circuit-labels"><span>Warm-up</span><span>New signals</span><span>Board finish</span></div>
          <button className="primary-action light" type="button" onClick={onStart}>Start my 12-minute set <span aria-hidden="true">→</span></button>
        </article>

        <article className="knowledge-pulse paper-card">
          <div className="card-kicker"><span>Knowledge pulse</span><button type="button" onClick={() => onNavigate("map")}>Open map</button></div>
          <div className="pulse-main">
            <div className="mastery-dial" style={{ "--mastery": `${mastery * 3.6}deg` } as CSSProperties}>
              <div><strong>{mastery}%</strong><small>mastery</small></div>
            </div>
            <div className="pulse-copy">
              <p>Stronghold</p><strong>{[...data.topics].sort((a, b) => b.mastery - a.mastery)[0]?.name}</strong>
              <p>Fastest gain</p><strong>{bestGap.name}</strong>
            </div>
          </div>
          <div className="metric-row">
            <div><strong>{data.profile.accuracy}%</strong><span>recall</span></div>
            <div><strong>{data.profile.totalReviews}</strong><span>retrievals</span></div>
            <div><strong>±{Math.max(5, 18 - data.profile.level * 2)}%</strong><span>uncertainty</span></div>
          </div>
          <button className="text-action" type="button" onClick={onDiagnostic}>Retake placement diagnostic <span>↗</span></button>
        </article>

        <article className="gap-card paper-card" style={accentStyle(bestGap.accent)}>
          <div className="card-kicker"><span>Best return</span><b>{bestGap.opportunity} opportunity</b></div>
          <div className="topic-monogram">{bestGap.icon}</div>
          <h3>{bestGap.name}</h3>
          <p>Frequent, reusable, and currently fragile. A focused sprint here should move your whole map.</p>
          <div className="why-score">
            <span>frequency</span><i>×</i><span>personal gap</span><i>×</i><span>memory decay</span>
          </div>
          <button className="secondary-action" type="button" onClick={onGap}>Run a gap sprint <span>→</span></button>
        </article>

        <article className="signal-card">
          <div className="signal-top"><span>Signal card · 01</span><b>Davy method</b></div>
          <div className="signal-constellation" aria-label="Clue signals: wise king, Ecclesiastes, son of David">
            <span className="signal-chip c1">wise king</span>
            <span className="signal-chip c2">Ecclesiastes</span>
            <span className="signal-chip c3">son of David</span>
            <span className="signal-chip c4">temple</span>
            <i /><b>?</b>
          </div>
          <div className="signal-answer"><small>Recurring answer</small><strong>Solomon</strong></div>
          <p>Learn the small set of answers that recur—then the clue language that gives them away.</p>
          <button type="button" onClick={() => onNavigate("learn")}>Explore Signal Cards <span>→</span></button>
        </article>
      </section>

      <section className="section-block track-section">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> Your curriculum</p><h2>Two paths. One memory engine.</h2></div>
          <button className="text-action" type="button" onClick={() => onNavigate("learn")}>View all tracks <span>→</span></button>
        </div>
        <div className="track-grid">
          <TrackCard label="Trivia foundations" title="Build the links that show up everywhere" progress={42} color="#6757e8" units="9 subject regions" stamps={["GE", "HI", "SC"]} />
          <TrackCard label="Personal studio" title="Statistics → models → data systems" progress={31} color="#f06049" units="3 technical tracks" stamps={["ST", "DS", "DE"]} />
        </div>
      </section>
    </div>
  );
}

function TrackCard({ label, title, progress, color, units, stamps }: { label: string; title: string; progress: number; color: string; units: string; stamps: string[] }) {
  return (
    <article className="track-card" style={{ "--track-color": color } as CSSProperties}>
      <div className="track-copy"><span>{label}</span><h3>{title}</h3><p>{units} · {progress}% mapped</p></div>
      <div className="stamp-stack" aria-hidden="true">{stamps.map((stamp, index) => <i key={stamp} style={{ transform: `rotate(${index * 5 - 5}deg)` }}>{stamp}</i>)}</div>
      <div className="track-progress" role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
    </article>
  );
}

function LearnView({ topics, bestGap, onStart }: { topics: Topic[]; bestGap: Topic; onStart: (topic: Topic) => void }) {
  const core = topics.filter((topic) => topic.kind !== "studio");
  const studio = topics.filter((topic) => topic.kind === "studio");
  return (
    <div className="page-wrap inner-page learn-page">
      <PageIntro number="02" eyebrow="The learning path" title="Build a web of useful clues." body="Start with high-frequency foundations, alternate academic and cultural lanes, then let your own evidence reshape the order." />
      <div className="learn-layout">
        <section className="learning-path" aria-label="Trivia foundations path">
          <div className="path-head"><span>Course 01</span><h2>Trivia foundations</h2><p>For bar nights, quiz shows, and everything between.</p></div>
          <PathNode index="00" title="How clues work" copy="Parse the wording, calibrate confidence, recognize recurring signals, and know when to pass." status="complete" accent="#15131c" onStart={() => onStart(core[0] ?? bestGap)} />
          {core.slice(0, 6).map((topic, index) => <PathNode key={topic.id} index={String(index + 1).padStart(2, "0")} title={topic.name} copy={topic.description} status={topic.slug === bestGap.slug ? "recommended" : topic.mastery > 65 ? "complete" : "open"} accent={topic.accent} mastery={topic.mastery} onStart={() => onStart(topic)} />)}
        </section>
        <aside className="learn-rail">
          <article className="priority-explainer ink-card">
            <p className="eyebrow light"><span /> Why this next?</p>
            <h3>{bestGap.name}</h3>
            <p>Clue Atlas balances what appears often with what you personally miss and what memory is starting to lose.</p>
            <div className="formula-stack"><span><b>0.92</b> format frequency</span><i>×</i><span><b>{(1 - bestGap.mastery / 100).toFixed(2)}</b> personal gap</span><i>×</i><span><b>1.14</b> review urgency</span></div>
            <button className="primary-action light" type="button" onClick={() => onStart(bestGap)}>Study the highest-return gap →</button>
          </article>
          <article className="studio-mini paper-card">
            <span>Course 02</span><h3>Your data studio</h3>
            {studio.map((topic) => <button key={topic.id} type="button" onClick={() => onStart(topic)}><i style={{ background: topic.accent }}>{topic.icon}</i><span><strong>{topic.name}</strong><small>{topic.mastery}% mastery</small></span><b>→</b></button>)}
          </article>
        </aside>
      </div>
    </div>
  );
}

function PathNode({ index, title, copy, status, accent, mastery = 100, onStart }: { index: string; title: string; copy: string; status: string; accent: string; mastery?: number; onStart: () => void }) {
  return (
    <article className={`path-node ${status}`} style={accentStyle(accent)}>
      <div className="path-badge"><span>{status === "complete" ? "✓" : index}</span></div>
      <div className="path-copy"><div><small>{status === "recommended" ? "Recommended next" : status === "complete" ? "Mapped" : `Region ${index}`}</small><h3>{title}</h3></div><p>{copy}</p><div className="mini-progress"><span style={{ width: `${mastery}%` }} /></div></div>
      <button type="button" onClick={onStart} aria-label={`Study ${title}`}>{status === "complete" ? "Review" : "Start"} <span>→</span></button>
    </article>
  );
}

function PlayView({ topics, onStart, onDaily }: { topics: Topic[]; onStart: (topic?: Topic) => void; onDaily: () => void }) {
  const boardTopics = topics.slice(0, 6);
  return (
    <div className="page-wrap inner-page play-page">
      <PageIntro number="03" eyebrow="Play room" title="Retrieval, with a pulse." body="Practice the way trivia feels: under pressure, across categories, with confidence and game value attached to every decision." />
      <section className="mode-grid">
        <button className="mode-card daily" type="button" onClick={onDaily}><span className="mode-no">01</span><div><small>Best daily habit</small><h2>Daily Circuit</h2><p>Due reviews, fresh signals, and a short board finish.</p></div><b>12 min →</b></button>
        <button className="mode-card board" type="button" onClick={() => onStart()}><span className="mode-no">02</span><div><small>Quiz-show energy</small><h2>Board Rush</h2><p>Clues rise in value and difficulty across a mixed board.</p></div><b>10 clues →</b></button>
        <button className="mode-card sprint" type="button" onClick={() => onStart([...topics].sort((a, b) => b.opportunity - a.opportunity)[0])}><span className="mode-no">03</span><div><small>Fastest improvement</small><h2>Gap Sprint</h2><p>Five focused minutes in your highest-return weak area.</p></div><b>5 min →</b></button>
      </section>
      <section className="board-preview">
        <div className="section-heading"><div><p className="eyebrow"><span /> Pick a lane</p><h2>Tonight’s board</h2></div><span className="board-note">Values reflect difficulty, not dollars.</span></div>
        <div className="clue-board" aria-label="Category board">
          {boardTopics.map((topic) => <button className="board-category" type="button" key={topic.id} onClick={() => onStart(topic)} style={accentStyle(topic.accent)}><i>{topic.icon}</i>{topic.name}</button>)}
          {[200, 400, 600, 800, 1000].flatMap((value, row) => boardTopics.map((topic) => <button className="board-cell" type="button" key={`${topic.id}-${value}`} onClick={() => onStart(topic)} style={{ animationDelay: `${(row * 6) * 20}ms` }}><span>{value}</span><small>{row < 2 ? "open" : row < 4 ? "stretch" : "deep cut"}</small></button>))}
        </div>
      </section>
    </div>
  );
}

function MapView({ topics, onStart }: { topics: Topic[]; onStart: (topic: Topic) => void }) {
  const [lens, setLens] = useState<"mastery" | "coverage" | "opportunity">("mastery");
  const sorted = [...topics].sort((a, b) => b[lens] - a[lens]);
  return (
    <div className="page-wrap inner-page map-page">
      <PageIntro number="04" eyebrow="Knowledge map" title="See the shape of what you know." body="Every region gets clearer as evidence accumulates. Pattern marks what is unseen; a bright edge marks what is worth learning next." />
      <div className="map-toolbar" role="group" aria-label="Map lens">
        <span>View by</span>{(["mastery", "coverage", "opportunity"] as const).map((item) => <button key={item} className={lens === item ? "active" : ""} type="button" aria-pressed={lens === item} onClick={() => setLens(item)}>{item}</button>)}
      </div>
      <section className="atlas-map" aria-label={`Topics by ${lens}`}>
        {sorted.map((topic, index) => {
          const value = topic[lens];
          return (
            <button key={topic.id} type="button" className={`map-region ${topic.kind === "studio" ? "studio" : ""}`} style={{ ...accentStyle(topic.accent), "--region-alpha": Math.max(.16, value / 100) } as CSSProperties} onClick={() => onStart(topic)}>
              <span className="region-index">{String(index + 1).padStart(2, "0")}</span><i>{topic.icon}</i><h3>{topic.name}</h3><strong>{value}<small>{lens === "opportunity" ? " score" : "%"}</small></strong><div className="region-bar"><span style={{ width: `${value}%` }} /></div><p>{topic.dueCount} due · {topic.attempted} seen</p>
            </button>
          );
        })}
      </section>
      <section className="map-table paper-card">
        <div className="section-heading compact"><div><h2>Sortable evidence view</h2><p>Same map, precise numbers.</p></div></div>
        <div className="table-scroll"><table><thead><tr><th>Region</th><th>Mastery</th><th>Coverage</th><th>Accuracy</th><th>Opportunity</th><th>Due</th></tr></thead><tbody>{sorted.map((topic) => <tr key={topic.id}><td><i style={{ background: topic.accent }}>{topic.icon}</i><strong>{topic.name}</strong></td><td>{topic.mastery}%</td><td>{topic.coverage}%</td><td>{topic.accuracy}%</td><td><b>{topic.opportunity}</b></td><td>{topic.dueCount}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function StudioView({ topics, form, setForm, onSubmit, submitting }: { topics: Topic[]; form: { topicSlug: string; prompt: string; answer: string; aliases: string; explanation: string; cues: string }; setForm: (next: typeof form) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; submitting: boolean }) {
  return (
    <div className="page-wrap inner-page studio-page">
      <PageIntro number="05" eyebrow="Personal studio" title="Teach the atlas what matters to you." body="Trivia is only the beginning. Add technical ideas, work knowledge, or any subject you want to retrieve—not merely recognize." />
      <div className="studio-layout">
        <form className="card-composer paper-card" onSubmit={onSubmit}>
          <div className="composer-head"><div><span>New study card</span><h2>Turn an idea into retrieval.</h2></div><i>+</i></div>
          <label>Track<select value={form.topicSlug} onChange={(event) => setForm({ ...form, topicSlug: event.target.value })}>{topics.map((topic) => <option value={topic.slug} key={topic.id}>{topic.name}</option>)}</select></label>
          <label>Prompt or clue<textarea value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} placeholder="When future information accidentally enters training data, it causes…" rows={3} required /></label>
          <div className="field-pair"><label>Canonical answer<input value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} placeholder="Data leakage" required /></label><label>Accepted aliases<input value={form.aliases} onChange={(event) => setForm({ ...form, aliases: event.target.value })} placeholder="target leakage, leakage" /></label></div>
          <label>Why it matters<textarea value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} placeholder="A concise explanation shown after retrieval…" rows={2} /></label>
          <label>Signal phrases <small>comma separated</small><input value={form.cues} onChange={(event) => setForm({ ...form, cues: event.target.value })} placeholder="future data, validation too good, target in features" /></label>
          <div className="source-notice"><i>✓</i><p><strong>Provenance by default.</strong> User-authored cards are labeled as yours; imported packs should include source and license metadata.</p></div>
          <button className="primary-action dark" type="submit" disabled={submitting}>{submitting ? "Saving to the atlas…" : "Add card to my studio →"}</button>
        </form>
        <aside className="studio-sidebar">
          <article className="signal-builder ink-card"><span>Signal anatomy</span><div className="mini-signal"><i>future info</i><i>validation</i><i>target</i><b>data leakage</b></div><h3>One answer, many paths in.</h3><p>Clue Atlas stores the concept, playable clue, accepted answers, and signal card separately—ready for deeper analysis later.</p></article>
          <article className="import-card paper-card"><span>Bring a pack</span><h3>CSV / JSON importer</h3><p>The documented import contract is ready for your own or licensed question sets.</p><button type="button" disabled>Importer in roadmap</button></article>
          <article className="studio-stats"><div><strong>{topics.filter((item) => item.kind === "studio").length}</strong><span>studio tracks</span></div><div><strong>1</strong><span>content owner</span></div><div><strong>100%</strong><span>traceable</span></div></article>
        </aside>
      </div>
    </div>
  );
}

function DataLabView({ data, connected }: { data: Bootstrap; connected: boolean }) {
  const attempts = data.recentAttempts ?? [];
  const highConfidence = attempts.filter((item) => item.confidence === "high");
  const calibrated = highConfidence.length ? Math.round(highConfidence.filter((item) => item.isCorrect).length / highConfidence.length * 100) : data.profile.accuracy;
  return (
    <div className="page-wrap inner-page data-page">
      <PageIntro number="06" eyebrow="Data lab" title="Your learning is a dataset." body="Every attempt is an immutable event. Current mastery is a model. Recommendations are explainable, exportable, and designed to become a serious analytics project." />
      <section className="data-metrics">
        <MetricCard label="Attempt events" value={data.counts.attempts.toLocaleString()} note="append-only evidence" accent="#6657e8" />
        <MetricCard label="Observed recall" value={`${data.profile.accuracy}%`} note={`${data.profile.totalReviews} graded retrievals`} accent="#48a887" />
        <MetricCard label="High-confidence accuracy" value={`${calibrated}%`} note="calibration signal" accent="#f06049" />
        <MetricCard label="Question inventory" value={data.counts.questions.toLocaleString()} note="original + user-authored" accent="#d5962f" />
      </section>
      <section className="data-grid">
        <article className="opportunity-lab ink-card">
          <div className="card-kicker"><span>Recommendation model</span><b>v1 · explainable</b></div><h2>Why the plan changed</h2><p>Your next topic is ranked by its reusable game value and the evidence in your own attempt history.</p>
          <div className="equation"><span><b>frequency</b><small>format prior</small></span><i>×</i><span><b>personal gap</b><small>1 − mastery</small></span><i>×</i><span><b>review urgency</b><small>memory decay</small></span><i>=</i><strong>learning EV</strong></div>
          <div className="ranked-bars">{[...data.topics].sort((a, b) => b.opportunity - a.opportunity).slice(0, 5).map((topic, index) => <div key={topic.id}><span>{index + 1}</span><i style={{ background: topic.accent }}>{topic.icon}</i><strong>{topic.name}</strong><div><b style={{ width: `${topic.opportunity}%`, background: topic.accent }} /></div><em>{topic.opportunity}</em></div>)}</div>
        </article>
        <article className="pipeline-card paper-card">
          <div className="card-kicker"><span>Portfolio architecture</span><b>{connected ? "live D1" : "preview"}</b></div><h2>Raw → curated → useful</h2>
          <div className="pipeline"><div><i>01</i><strong>Attempt events</strong><small>answers · speed · confidence</small></div><span>→</span><div><i>02</i><strong>Learning state</strong><small>schedule · mastery · uncertainty</small></div><span>→</span><div><i>03</i><strong>Decision layer</strong><small>gaps · queue · quests</small></div></div>
          <p className="pipeline-note">The event grain is one submitted response to one versioned question. Scheduler state can be rebuilt from the review log.</p>
          <div className="export-actions"><a href="/api/export/attempts.csv" download>Export attempts.csv ↓</a><a href="/api/export/attempts.json" download>Export JSON ↓</a></div>
        </article>
      </section>
      <section className="attempt-table paper-card">
        <div className="section-heading compact"><div><h2>Recent evidence</h2><p>Latest graded retrievals, suitable for analysis.</p></div><span>{attempts.length} visible rows</span></div>
        <div className="table-scroll"><table><thead><tr><th>Topic</th><th>Response</th><th>Result</th><th>Confidence</th><th>Latency</th></tr></thead><tbody>{attempts.length ? attempts.slice(0, 10).map((attempt) => <tr key={attempt.id}><td><strong>{attempt.topicName}</strong></td><td>{attempt.answer || "Passed"}</td><td><span className={attempt.isCorrect ? "result-good" : "result-miss"}>{attempt.isCorrect ? "correct" : "useful miss"}</span></td><td>{attempt.confidence ?? "—"}</td><td>{attempt.responseMs ? `${(attempt.responseMs / 1000).toFixed(1)}s` : "—"}</td></tr>) : <tr><td colSpan={5} className="empty-row">Your first played clues will appear here. The data model is already waiting.</td></tr>}</tbody></table></div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) {
  return <article className="metric-card" style={accentStyle(accent)}><span>{label}</span><strong>{value}</strong><p>{note}</p><i /></article>;
}

function StudySession({ session, question, draft, confidence, revealed, correct, submitting, onDraft, onConfidence, onSubmit, onRate, onLeave }: { session: { mode: Mode; title: string; questions: Question[]; index: number; results: SessionResult[] }; question: Question; draft: string; confidence: Confidence; revealed: boolean; correct: boolean; submitting: boolean; onDraft: (value: string) => void; onConfidence: (value: Confidence) => void; onSubmit: (event?: FormEvent) => void; onRate: (rating: Rating) => void; onLeave: () => void }) {
  const progress = Math.round(session.index / session.questions.length * 100);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [question.id]);

  return (
    <main className="session-page" id="main-content">
      <header className="session-header"><button type="button" onClick={onLeave} aria-label="Leave session">×</button><div role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div><p>{session.index + 1} / {session.questions.length}</p></header>
      <div className="session-wrap">
        <div className="session-meta"><div><span className="session-mode">{session.mode === "diagnostic" ? "Placement diagnostic" : session.title}</span><h1>{question.topic.name}</h1></div><div className="clue-value"><small>difficulty {question.difficulty}</small><strong>{question.value}</strong></div></div>
        <article className={`question-card ${revealed ? "revealed" : ""}`} style={accentStyle(question.topic.accent)}>
          <div className="question-number"><span>{question.topic.icon}</span><p>Clue {String(session.index + 1).padStart(2, "0")}</p><i /></div>
          <p className="question-prompt">{question.prompt}</p>
          <form onSubmit={onSubmit} className="answer-form">
            <label htmlFor="answer-input">Your response</label>
            <div className="answer-input-row"><input id="answer-input" ref={inputRef} autoComplete="off" value={draft} onChange={(event) => onDraft(event.target.value)} disabled={revealed || submitting} placeholder="Type what comes to mind…" /><button type="submit" disabled={!draft.trim() || revealed || submitting}>{session.mode === "diagnostic" ? "Lock in" : "Check"} <span>↵</span></button></div>
            {!revealed && <div className="confidence-picker"><span>How sure are you?</span>{(["low", "medium", "high"] as Confidence[]).map((item) => <button type="button" className={confidence === item ? "active" : ""} aria-pressed={confidence === item} onClick={() => onConfidence(item)} key={item}>{item === "low" ? "Guessing" : item === "medium" ? "Leaning" : "Know it"}</button>)}</div>}
          </form>
          {revealed && (
            <div className={`answer-reveal ${correct ? "correct" : "miss"}`}>
              <div className="reveal-head"><span>{correct ? "✓" : "↗"}</span><div><small>{correct ? confidence === "low" ? "You knew more than you thought." : "Clean pull." : "Useful miss. It’s in the plan now."}</small><strong>{question.answer}</strong></div></div>
              <p>{question.explanation}</p>
              <div className="cue-list"><span>Signals</span>{question.pavlovCues.map((cue) => <i key={cue}>{cue}</i>)}</div>
            </div>
          )}
        </article>
        {session.mode === "diagnostic" ? <p className="diagnostic-note">This isn’t an exam. “Not sure” is excellent data. Answers stay hidden until your fingerprint is ready.</p> : revealed ? (
          <div className="rating-panel"><p>How did that retrieval feel?</p><div>{(["again", "hard", "good", "easy"] as Rating[]).map((rating, index) => <button type="button" key={rating} onClick={() => onRate(rating)} disabled={submitting} className={rating}><span>{index + 1}</span><strong>{rating === "again" ? "Missed" : rating === "hard" ? "Shaky" : rating === "good" ? "Got it" : "Instant"}</strong><small>{["relearn", "shorter", "standard", "longer"][index]}</small></button>)}</div></div>
        ) : <p className="session-tip"><span>Tip</span> Retrieval first. Recognition is the backup plan.</p>}
      </div>
    </main>
  );
}

function CompletionScreen({ completion, onDone, onAgain }: { completion: { mode: Mode; title: string; results: SessionResult[] }; onDone: () => void; onAgain: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const correct = completion.results.filter((item) => item.correct).length;
  const accuracy = Math.round(correct / completion.results.length * 100);
  const byTopic = completion.results.reduce<Record<string, { correct: number; total: number }>>((acc, item) => {
    acc[item.topic] ??= { correct: 0, total: 0 };
    acc[item.topic].total += 1;
    if (item.correct) acc[item.topic].correct += 1;
    return acc;
  }, {});
  const strongest = Object.entries(byTopic).sort((a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total)[0]?.[0] ?? "Still mapping";
  const gap = Object.entries(byTopic).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)[0]?.[0] ?? "Still mapping";
  const highMisses = completion.results.filter((item) => !item.correct && item.confidence === "high").length;
  return (
    <main className="completion-page" id="main-content">
      <div className="completion-stamp" aria-hidden="true"><span>{completion.mode === "diagnostic" ? "KF" : "✓"}</span><i /></div>
      <p className="eyebrow"><span /> {completion.mode === "diagnostic" ? "Knowledge fingerprint ready" : "Circuit complete"}</p>
      <h1 ref={headingRef} tabIndex={-1}>{completion.mode === "diagnostic" ? "Your atlas has a starting point." : `${completion.results.length} clues stronger.`}</h1>
      <p>{completion.mode === "diagnostic" ? `${strongest} is already a stronghold. Your fastest gains are hiding in ${gap}.` : "Every clean pull strengthened a path. Every miss made tomorrow’s queue smarter."}</p>
      <div className="completion-grid"><div><strong>{accuracy}%</strong><span>observed recall</span></div><div><strong>{strongest}</strong><span>stronghold</span></div><div><strong>{gap}</strong><span>highest-return gap</span></div><div><strong>{highMisses}</strong><span>confident surprises</span></div></div>
      <div className="completion-actions"><button className="primary-action dark" type="button" onClick={onDone}>{completion.mode === "diagnostic" ? "Open my knowledge map →" : "Back to today →"}</button><button className="secondary-action" type="button" onClick={onAgain}>Run another set</button></div>
    </main>
  );
}

function PageIntro({ number, eyebrow, title, body }: { number: string; eyebrow: string; title: string; body: string }) {
  return <section className="page-intro"><div className="page-number">{number}</div><div><p className="eyebrow"><span /> {eyebrow}</p><h1>{title}</h1><p>{body}</p></div></section>;
}
