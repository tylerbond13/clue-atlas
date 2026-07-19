# Curriculum

## Teaching order

Trivia is too large to learn as a list. Clue Atlas begins with knowledge that is
stable, frequently useful, and connected to many other categories. The initial
order is a teaching priority, not a claim that every event uses the same category
distribution.

### 0. How Clues Work

Teach the mechanics before the facts:

- identify the person, place, work, event, or term being requested;
- separate high-information signals from decorative wording;
- recognize recurring clue-answer associations;
- distinguish “I know” from “I can recognize”;
- report confidence honestly;
- use partial retrieval and confusion pairs;
- answer precisely, or pass when a format penalizes guessing.

### 1. Geography

Begin with countries, capitals, major cities, physical geography, borders,
waterways, landmarks, U.S. states, and map relationships. Geography provides a
scaffold for history, politics, literature, art, food, and current events.

### 2. U.S. history and presidents

Build a chronological backbone: founding documents, presidents and
administrations, wars, constitutional changes, social movements, inventions,
and cultural eras. Bar trivia benefits from recognizable people and dates;
quiz-show-style play also rewards offices, quotations, firsts, and succession.

### 3. World history

Organize around broad periods and connected regions rather than isolated years:
ancient civilizations, empires, religions, exploration, revolutions,
industrialization, world wars, decolonization, and postwar institutions.

### 4. Science and nature

Cover high-school-scale foundations first: units and measurement, the periodic
table, the solar system, anatomy, genetics and evolution, ecology, geology,
weather, and major discoveries. Add deeper specialist facts only after the
conceptual frame is secure.

### 5. Literature and language

Start with authors and major works, genres, literary characters, mythology in
literature, poetry forms, etymology, rhetoric, and common wordplay patterns.
Connections between author, era, nationality, and work are more reusable than
plot minutiae.

### 6. Religion and mythology

Teach respectfully and descriptively: major texts, figures, traditions, places,
holidays, Greco-Roman and Norse mythology, and common cross-cultural motifs.
Avoid presenting a tradition's belief claims as universal fact.

### 7. Visual art and classical music

Use movements as anchors, then connect artists/composers to works, periods,
countries, media, and distinctive signals. Accessible image and audio material
belongs here later, but only when rights and alternatives are clear.

### 8. Film, television, and popular music

Balance durable canon with era and genre coverage. Favor creators, performers,
works, awards, adaptations, and cultural context over volatile celebrity news.

### 9. Sports

Start with rules, positions, major events, trophies, franchises, venues, and
widely significant records. Recency-sensitive records must carry an “as of” date
and should not be hard-coded as timeless claims.

### 10. Food, drink, and everyday culture

Cover world cuisines, ingredients and techniques, cocktails, brands, inventions,
holidays, transportation, and recognizable material culture. Be explicit when a
food origin is disputed.

## Format overlays

The foundation stays shared; a learner goal changes the weights and examples.

| Area | Bar Trivia emphasis | Quiz-show-style emphasis |
| --- | --- | --- |
| Geography | logos, travel, landmarks, local geography | rivers, borders, capitals, explorers |
| History | famous events, decades, Americana | chronology, leaders, dynasties, treaties |
| Science | everyday science, animals, space | terminology, discoverers, etymology |
| Literature | bestsellers, adaptations, characters | authors, poetry, classics, quotations |
| Arts | awards, album/film recognition | movements, composers, opera, fine art |
| Sports | current leagues and stars | history, venues, trophies, international events |
| Culture | brands, food, TV, popular music | religion, mythology, wordplay, recurring associations |

Current events are an overlay, not a permanent base category. Each item needs a
publication date, an “as of” date, and a retirement/review policy.

## Data Studio track

Technical concepts use the same retrieval engine but should favor explanations,
counterexamples, and small applied prompts over trivia-style name recall.

### Level 1 — Data foundations

- tabular data, data types, missing values, keys, and grain;
- tidy data and normalization intuition;
- SQL selection, filtering, grouping, joins, and null behavior;
- descriptive statistics and visualization choice;
- reproducibility, version control, and data provenance.

### Level 2 — Analysis

- probability, sampling, distributions, and the central limit theorem;
- confidence intervals, hypothesis tests, effect size, and power;
- regression assumptions and interpretation;
- window functions, common table expressions, and query plans;
- experimental design, randomization, bias, and causal diagrams.

### Level 3 — Data engineering

- batch versus streaming;
- transactional versus analytical workloads;
- star schemas, dimensions, facts, and slowly changing dimensions;
- orchestration, idempotency, retries, backfills, and observability;
- file formats, partitioning, schema evolution, and data contracts.

### Level 4 — Data science and machine learning

- leakage, baselines, features, cross-validation, and regularization;
- classification/regression metrics and threshold selection;
- trees, linear models, clustering, and embeddings;
- calibration, drift, fairness, and model monitoring;
- deployment boundaries and communicating uncertainty.

### Level 5 — Portfolio labs

- analyze personal recall curves;
- evaluate confidence calibration;
- compare scheduler policies;
- inspect category opportunity scores;
- build and document a small content pipeline;
- test whether faster responses trade off with accuracy.

## Knowledge-unit design

A topic contains knowledge units; a unit can have multiple original questions.
The unit captures the durable thing to learn, while question wording provides
retrieval variation.

Each unit should include:

- a stable slug and canonical title;
- a compact, factual summary;
- canonical answer and accepted aliases where relevant;
- one or more high-information signals;
- topic and parent-topic placement;
- difficulty, importance, and optional game-value metadata;
- source, license, author/curator, and review date;
- at least one original prompt and concise explanation.

Good variation tests the same link from different directions. Superficial
paraphrases that leak the answer, ambiguous questions, and trick wording do not
improve the model.

## Diagnostic blueprint

An opening diagnostic should be short enough to finish and broad enough to
separate obvious strengths from high-return gaps. A target experience is 7–10
minutes and roughly 24 questions, but the MVP may use a smaller fixed sample.

Sampling should:

- cover the broad foundation before specializing;
- mix easy, medium, and hard items;
- avoid multiple items that reveal one another;
- include primarily free recall with limited recognition questions;
- record response time and confidence;
- treat “not sure” as a valid, informative response;
- delay explanations until a batch ends when priming is a risk.

An adaptive version may use uncertainty sampling later. It must preserve enough
random exploration to avoid declaring an unseen category a permanent weakness.

## Content coverage and quality

The MVP seed is intentionally representative, not comprehensive. Expansion
should be measured at several levels:

- topics with at least one reviewed knowledge unit;
- units with at least two independent retrieval prompts;
- alias coverage and adjudication notes;
- source/license completeness;
- difficulty and importance distribution;
- answer duplication and near-duplicate fingerprints;
- learner-facing ambiguity reports.

Content volume is not a quality metric. Prefer a small, reviewed, traceable set
over a large generated corpus. The rules in [Data sources &
licensing](DATA_SOURCES.md) apply to every track.
