# Learning engine

This document defines the reasoning contract behind Clue Atlas: how observations
become a knowledge estimate, how the next topic is prioritized, and how an answer
becomes a scheduled review. The implementation should remain explainable even as
the estimates become more sophisticated.

## Inspiration and boundaries

[Colin Davy's “How I Won Jeopardy With Data
Science”](https://colindavy.medium.com/how-i-won-jeopardy-with-data-science-c2e9b52a1958)
describes a pragmatic compression strategy:

1. identify answers that recur frequently within a category;
2. reduce clue text to high-information terms and repeated phrases;
3. study those associations as compact visual cards;
4. spend scarce preparation time on categories where that compression is most
   valuable.

Clue Atlas adapts that idea in two ways. It estimates each learner's own gap, and
it distinguishes general frequency from value in a chosen game or curriculum.
It does **not** reproduce Davy's cards, scraper, or dataset. In particular, this
project has no J! Archive scraper or distributed archive corpus. Frequency inputs
must come from original/clearly licensed material or transparent editorial
priors. See [Data sources & licensing](DATA_SOURCES.md).

## The observation loop

A presented question creates an observation only after the learner submits or
passes. The minimum useful observation is:

- learner, question, card, topic, and session context;
- raw and normalized response;
- correctness and match type;
- elapsed response time;
- confidence and whether a hint was used;
- study/game mode;
- recall rating for review interactions;
- timestamp and an idempotency key.

Confidence is persisted as the small ordinal scale `low / medium / high` rather
than asking learners for a false-precision percentage. A companion
`confidence_provided` flag distinguishes a reported value from the API's
compatibility default; only explicit values update calibration projections. A UI
may label the choices more conversationally, for example **guessed / leaned /
knew**, while preserving the stable export values.

The raw attempt is append-only. Derived state—card schedule, topic mastery,
coverage, opportunity, XP—can be updated transactionally and rebuilt from the
event log where practical.

## Diagnostic estimates

For a cold start, Clue Atlas samples across broad topics and difficulty. It
should not infer “weak” from “unseen.” Coverage and recall are separate:

```text
coverage = distinct active questions attempted / eligible active questions
recall   = smoothed correct attempts / smoothed total attempts
gap      = 1 - predicted recall
```

A simple analysis query can use a Beta(1, 1) prior:

```text
smoothed recall = (correct_count + 1) / (attempt_count + 2)
```

That equation is a reporting baseline, not a claim that all questions have equal
difficulty. A later model can incorporate difficulty, recency, response time,
question format, and repeated exposures. Version every material estimator change
so historical recommendation explanations remain reproducible.

## Opportunity score

The conceptual score is:

```text
base opportunity = frequency × personal gap × game value
review priority  = base opportunity × due urgency
```

All components are normalized to `[0, 1]` for comparison within an eligible
candidate set.

### Frequency (`F`)

How often a knowledge unit is expected to be useful. Frequency may be estimated
from:

- counts in an approved, versioned, licensed corpus;
- occurrence across the project's original question bank;
- a clearly labeled editorial prior when no suitable corpus exists.

It is never silently derived from scraped proprietary clues. Store the input's
source and version.

### Personal gap (`G`)

The learner's current miss probability, ideally adjusted for recency and
difficulty. For a new learner, use a conservative prior and keep uncertainty
visible. A high-confidence miss can raise the priority of a misconception
without rewriting the raw event.

### Game value (`V`)

How much retrieval matters for the selected objective. It can combine:

- curriculum importance and cross-category usefulness;
- likelihood that the unit appears in a selected format;
- clue/round value where the mode has values;
- a user or teacher weight for a custom track.

Game value is not the learner's score on the last question. It is a versioned
property of the learning objective.

### Due urgency (`U`)

How overdue a scheduled memory is. New content uses an exploration policy rather
than pretending to have a due date. Cap urgency so a long-overdue low-value card
does not permanently starve all other work.

### Current MVP proxy

The first schema stores `importance_weight` on topics and `importance`/`value` on
content. Its topic projection uses these formulas:

```text
coverage = distinct questions attempted / active questions in topic
posterior accuracy = (correct + 1) / (attempts + 2)
mastery = posterior accuracy × (0.35 + 0.65 × sqrt(coverage))
opportunity = 100 × topic importance × (1 - mastery)
              × (0.65 + 0.35 × (1 - coverage))
```

Coverage, mastery, and opportunity are clamped to their declared ranges (0–1,
0–1, and 0–100 respectively). Curated importance is a joint proxy for frequency
and game value, while the coverage term provides exploration. This is
intentionally simpler than the full formula. The UI should call it an estimate
and must not imply that a large external corpus has already been analyzed.

### “Why this next?”

A recommendation explanation should name its evidence, for example:

> World rivers is next because it is a high-importance topic, your estimated
> recall is low, and you have seen only a small part of the available set.

Do not expose only a decimal score. Show component labels, input dates, and a
fallback when evidence is sparse.

## Spaced review

The MVP scheduler is SM-2-inspired, with one state row per learner/card and an
append-only review log. It supports four learner-facing ratings:

| UI label | Meaning | Common internal name |
| --- | --- | --- |
| Missed | Could not retrieve or was wrong | Again |
| Shaky | Correct with effort, hint, or fragile recall | Hard |
| Got it | Correct with reasonable effort | Good |
| Instant | Fast, confident free recall | Easy |

The interface should show the projected next interval beside each rating. The
scheduler tracks at least ease, repetitions, lapses, interval, last review, due
time, rating, and scheduler version. The current version is
`clue-atlas-sm2-v1`:

| Rating | Version 1 transition |
| --- | --- |
| `again` | Due in 10 minutes; repetitions reset; lapse +1; ease −0.20; learning |
| `hard` | 12 hours when new, otherwise interval ×1.2 (minimum 1 day); repetition +1; ease −0.15 |
| `good` | 1 day first, 3 days second, then interval × ease; repetition +1; review |
| `easy` | 4 days first, otherwise max(4 days, interval × ease ×1.3); repetition +1; ease +0.15; review |

Ease is clamped to `1.3–3.0` and intervals to 10 minutes–3,650 days. Version 1
has no random interval “fuzz,” so state + rating + timestamp is reproducible.

Behavioral invariants matter more than a magic interval table:

- **Missed** records a lapse, shortens the interval, and moves the card back
  toward learning.
- **Shaky** advances cautiously and should not be rewarded like fluent recall.
- **Got it** grows the interval according to the current ease.
- **Instant** grows it more, but never lets one lucky recognition retire a new
  card indefinitely.
- Time moves forward in absolute timestamps; interval-day fields are derived
  scheduling inputs, not a replacement for `due_at`.
- Manual/admin corrections create a traceable adjustment rather than erasing a
  review.

The scheduler is not yet presented as validated FSRS. A future FSRS evaluation
should compare held-out recall/log-loss and workload against the current policy,
then migrate state under a new `scheduler_version`.

## Answer adjudication

Normalize conservatively:

1. preserve the raw answer;
2. Unicode-normalize and trim for comparison;
3. compare a normalized canonical answer and explicit aliases;
4. record `match_type` such as canonical, alias, rejected, or manual;
5. never silently accept a fuzzy match that changes the named entity.

Punctuation, case, and harmless articles may be ignored when appropriate. Names,
units, negation, and materially different spellings may require explicit aliases
or review. Store aliases per question so acceptance decisions can be audited.

## Confidence calibration

Confidence fields are persisted with every attempt and reported separately from
accuracy. Only `confidence_provided = true` rows contribute. Version 1 maps low
to `0.40`, medium to `0.65`, and high to `0.85` for a simple probabilistic score:

```text
brier score = mean((mapped confidence - correctness)²)
brier-derived calibration = 1 - brier score
```

The stored `calibration` field is therefore a 0–1 Brier-derived forecast-skill
summary where higher is better; it is not, by itself, a reliability diagram or
proof of calibration. Display observed accuracy and sample size for each ordinal
bucket rather than treating the mapping as learned truth. Useful diagnostic
labels are:

- **high-confidence miss:** likely misconception;
- **low-confidence correct:** underestimated knowledge;
- **fast correct:** accessible under pressure;
- **slow correct:** known, but not yet fluent.

## Cold start and exploration

Multiplication can collapse a new topic to zero. Guard against this with:

- non-zero priors for recall and frequency;
- an explicit coverage-uncertainty term;
- a small exploration quota in each diagnostic/session;
- minimum representation across core categories;
- deterministic tie-breaking for reproducible tests.

Recommendation code should accept an “as of” timestamp and policy version. This
makes tests stable and portfolio analyses reproducible.

## Evaluation

Evaluate the engine on outcomes rather than clicks:

- recall at the scheduled horizon;
- Brier score or log loss for predicted recall;
- calibration by topic and difficulty;
- review workload and overdue backlog;
- coverage balance across core topics;
- rank stability when one noisy observation arrives;
- long-term accuracy and response-time change;
- recommendation diversity and cold-start fairness.

All evaluations must use time-aware splits. Randomly mixing later reviews into
training data for earlier predictions leaks the future.
