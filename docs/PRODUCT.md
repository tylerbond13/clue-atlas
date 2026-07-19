# Product & roadmap

## Product promise

Clue Atlas helps a learner build broad, retrievable knowledge while showing why
each next lesson is worth their time.

The core loop is:

```text
Diagnose → find the highest-value gap → learn the signal → retrieve under
pressure → schedule the next review → update the map
```

At any point, the product should answer:

1. What do I know?
2. What would be most valuable to learn next?
3. Can I retrieve it when it counts?

## Who it is for

### The all-around trivia learner

Wants a structured alternative to reading random fact lists. Clue Atlas builds a
broad foundation and spends less time on knowledge the learner already owns.

### The bar-trivia regular

Needs breadth, pop culture, sports, brands, food and drink, and recent-event
context. They benefit from team-friendly practice and mixed-category rounds.

### The quiz-show-style competitor

Needs fast free recall, recurring clue-answer associations, confidence under a
timer, and category-specific gap analysis. Clue Atlas does not attempt to clone
any show or reproduce a proprietary archive.

### The data learner

Wants SQL, statistics, experimentation, data engineering, and machine-learning
concepts in the same retrieval system—and wants the resulting event stream to be
a credible analysis project.

## Experience principles

- **Retrieval before recognition.** Typing or recalling an answer is the default;
  multiple choice is a lower-signal rescue.
- **Uncertainty is useful.** “Not sure” and low confidence improve the model.
- **Explain the recommendation.** A score without its components is not a useful
  learning plan.
- **Celebrate durable learning.** XP follows recall quality and return visits,
  not repetitive tapping.
- **Playful, not juvenile.** The visual direction is an editorial knowledge
  atlas: warm paper, ink, electric color, collectible stamps, and restrained
  motion.
- **Accessible by construction.** Color is never the only encoding; timers,
  sound, motion, and input mode must be adjustable.
- **Data is a product surface.** Learners can inspect and export the evidence used
  to characterize their knowledge.

## Signature concepts

### Knowledge Fingerprint

The result of a cross-category diagnostic. It should call out strongholds,
fragile knowledge, high-confidence misses, underestimated strengths, and the
highest-return next category. The diagnostic records correctness, response time,
and confidence, but avoids teaching after every question so it does not prime
later answers.

### Signal Cards

A signal card compresses a recurring association into a retrieval-friendly
form:

- front: a small set of high-information clue fragments;
- back: the canonical answer, a compact explanation, aliases, and category;
- evidence: frequency/importance, source, personal accuracy, confidence, speed,
  and next review;
- accessibility: a ranked phrase list whenever a visual cloud is shown.

Signal Cards are inspired by [Colin Davy's account of his data-driven study
method](https://colindavy.medium.com/how-i-won-jeopardy-with-data-science-c2e9b52a1958).
Clue Atlas uses original or clearly licensed content, not his cards or source
corpus.

### Knowledge Map

An atlas-like view of learning state. Each category can expose four independent
lenses:

- **Coverage:** how much has been encountered;
- **Recall:** estimated probability of a correct response;
- **Speed:** retrieval under pressure;
- **Calibration:** how confidence aligns with results.

Every chart should have a readable text or table equivalent.

### Studio and Data Lab

**Studio** is the authoring surface for tracks, categories, questions, aliases,
signals, and imports. **Data Lab** explains recommendations and makes attempts,
review history, category estimates, source lineage, and exports inspectable.

## Game and study modes

The intended first three modes are:

- **Daily Circuit:** due reviews, a few new signals, and a short pressure round;
- **Board Rush:** a category board with increasing values and an optional timer;
- **Gap Sprint:** a short set from the learner's highest-return weak area.

Later possibilities include a hosted pub round, signal matching, sudden death,
team play, and image/audio rounds. Multiplayer and public leaderboards should
wait until the solo learning loop is trustworthy.

## Gamification policy

Clue Atlas may use XP, weekly quests, region stamps, levels, achievements, and a
gentle streak ember. It should not use lives, shame, paid streak protection, or
punitive loss loops. Accessibility settings never reduce rewards.

Suggested progression language:

```text
Observer → Collector → Connector → Ringer → Archivist
```

## MVP contract

The first useful product proves that diagnostic, review, play, and analytics can
share one coherent event model.

| Capability | MVP intent | Not promised yet |
| --- | --- | --- |
| Curriculum | Small, original seed set across representative tracks | Comprehensive trivia coverage |
| Diagnostic | Broad sample with results that reveal gaps | Psychometrically validated adaptive test |
| Review | Four recall ratings and an SM-2-inspired schedule | Tuned FSRS parameters or cross-device sync |
| Play | A polished representative board/session loop | Multiplayer, host tooling, voice adjudication |
| Knowledge model | Attempt history, per-card state, topic estimates | A production-trained recommendation model |
| Studio | A path toward custom content and tracks | Public marketplace or automatic web ingestion |
| Data Lab | Documented SQL and CSV/JSON contract | Hosted warehouse, notebooks-as-a-service, BI sync |
| Identity | Schema-ready learner ownership | Production account lifecycle and collaboration |

Some repository builds may demonstrate these flows with local or seeded state
before every write path is backed by durable storage. Treat the data model as the
contract and the release notes/tests as evidence of implemented behavior.

## Success measures

Product metrics should reward learning quality, not time spent:

- due-review completion without excessive backlog;
- free-recall accuracy after 7 and 30 days;
- median response time at a stable accuracy level;
- calibration error between confidence and correctness;
- coverage of core categories;
- opportunity-score reduction in a learner's largest gaps;
- custom content retained and reviewed after import;
- export completeness and attempt-event integrity.

Avoid treating raw XP, streak length, or total sessions as primary learning
outcomes.

## Roadmap

### Phase 1 — The playable atlas

- Finish the visual system and responsive learning shell.
- Ship a representative diagnostic, Daily Circuit, and Board Rush.
- Persist attempts, review state, topic estimates, XP, and achievements.
- Seed original, source-traceable trivia and Data Studio material.
- Expose recommendation reasons and basic exports.

### Phase 2 — A trustworthy learning engine

- Calibrate frequency and game-value weights with approved datasets.
- Add confusion pairs, accepted-answer review, and content quality tooling.
- Validate intervals against observed forgetting curves; evaluate FSRS.
- Expand Knowledge Map lenses and confidence-calibration analysis.
- Add Studio import validation and source-manifest workflows.

### Phase 3 — Personal studio

- Create and version custom tracks, concepts, and signal cards.
- Support portable backups and idempotent imports.
- Add image/audio content only with explicit rights and accessible alternatives.
- Add PWA/offline review and reliable multi-device sync.

### Phase 4 — Social play, carefully

- Hosted team rounds and private groups.
- Fair scoring and moderation controls.
- Opt-in comparative analytics with privacy-preserving defaults.
- Public/community content only after licensing and review workflows are mature.

## Non-goals

- Mirroring or scraping J! Archive or another proprietary clue collection.
- Reproducing a television show's board, branding, or exact rules.
- Hiding recommendation logic behind an unexplained “AI” score.
- Generating large quantities of unreviewed trivia.
- Optimizing engagement at the expense of rest, accessibility, or learning.
