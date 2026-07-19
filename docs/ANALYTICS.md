# Analytics, SQL & exports

Clue Atlas is intentionally useful as a data-science example project. The
application records immutable learning facts, deterministic scheduler
transitions, content/source dimensions, and rebuildable serving projections.
That supports both honest product feedback and reproducible portfolio analysis.

Read [Data model & event grain](DATA_MODEL.md) before querying. Unless a query
says otherwise, its unit of analysis is one row in `attempts`: one learner's
evaluated response to one question at one time.

## Analysis principles

- State the grain of every dataset and chart.
- Use a learner/time filter before interpreting aggregates.
- Separate first exposure from repeated review.
- Keep correctness, confidence, speed, and hint use as distinct measures.
- Use time-aware splits for prediction; never train on a learner's future.
- Show sample size and uncertainty next to rates.
- Join content provenance when publishing question-level examples.
- Treat `user_topic_estimates` as a cache; facts remain authoritative.

The examples use SQLite/D1 syntax and a named `:user_id` parameter. Substitute a
safe bound parameter in application code—never interpolate a user-provided ID.

## Topic snapshot

Grain: one learner/topic across all recorded attempts in the selected period.

```sql
SELECT
  t.slug AS topic_slug,
  t.name AS topic_name,
  COUNT(*) AS attempts,
  COUNT(DISTINCT a.question_id) AS distinct_questions,
  ROUND(AVG(a.is_correct) * 100.0, 1) AS accuracy_pct,
  ROUND(AVG(CASE WHEN a.response_ms IS NOT NULL THEN a.response_ms END), 0)
    AS mean_response_ms,
  ROUND(AVG(a.hint_used) * 100.0, 1) AS hint_rate_pct
FROM attempts AS a
JOIN questions AS q ON q.id = a.question_id
JOIN topics AS t ON t.id = q.topic_id
WHERE a.user_id = :user_id
GROUP BY t.id, t.slug, t.name
ORDER BY accuracy_pct ASC, attempts DESC;
```

This is descriptive accuracy, not a causal estimate or a difficulty-adjusted
mastery score.

## First-exposure diagnostic

Repeated cards can make familiar topics look stronger. This query keeps only the
first recorded response to each question.

```sql
WITH ranked AS (
  SELECT
    a.*,
    ROW_NUMBER() OVER (
      PARTITION BY a.user_id, a.question_id
      ORDER BY a.attempted_at, a.id
    ) AS exposure_number
  FROM attempts AS a
  WHERE a.user_id = :user_id
)
SELECT
  t.name AS topic,
  COUNT(*) AS first_exposures,
  ROUND(AVG(r.is_correct) * 100.0, 1) AS first_exposure_accuracy_pct
FROM ranked AS r
JOIN questions AS q ON q.id = r.question_id
JOIN topics AS t ON t.id = q.topic_id
WHERE r.exposure_number = 1
GROUP BY t.id, t.name
ORDER BY first_exposure_accuracy_pct, first_exposures DESC;
```

## Confidence calibration

The MVP stores confidence as `low`, `medium`, or `high`, mapped by version 1 to
`0.40`, `0.65`, and `0.85`. Start by reporting each bucket without hiding the
ordinal observation behind one score:

```sql
SELECT
  a.confidence,
  COUNT(*) AS attempts,
  ROUND(AVG(a.is_correct) * 100.0, 1) AS observed_accuracy_pct,
  ROUND(AVG(a.hint_used) * 100.0, 1) AS hint_rate_pct
FROM attempts AS a
WHERE a.user_id = :user_id
  AND a.confidence_provided = 1
GROUP BY a.confidence
ORDER BY CASE a.confidence
  WHEN 'low' THEN 1
  WHEN 'medium' THEN 2
  WHEN 'high' THEN 3
END;
```

Only rows with `confidence_provided = 1` contribute to calibration. The database
retains a valid default label for compatibility, but the flag prevents an omitted
API field from masquerading as learner-reported medium confidence. The projection
accumulates `(mapped_confidence - is_correct)²` and stores
`calibration = 1 - mean_squared_error`. This is a Brier-derived forecast-skill
summary from 0–1 where higher is better, not a reliability diagram or proof of
calibration. Confidence intervals and a learned probability mapping are roadmap
work. Always show bucket counts: three high-confidence attempts do not establish
good calibration.

## Retrieval speed versus accuracy

Grain: one response-time band. Slow/missing values are kept separate rather than
silently dropped.

```sql
WITH bucketed AS (
  SELECT
    is_correct,
    CASE
      WHEN response_ms IS NULL THEN 'unknown'
      WHEN response_ms < 3000 THEN '<3s'
      WHEN response_ms < 7000 THEN '3–7s'
      WHEN response_ms < 15000 THEN '7–15s'
      ELSE '15s+'
    END AS speed_band
  FROM attempts
  WHERE user_id = :user_id
)
SELECT
  speed_band,
  COUNT(*) AS attempts,
  ROUND(AVG(is_correct) * 100.0, 1) AS accuracy_pct
FROM bucketed
GROUP BY speed_band
ORDER BY CASE speed_band
  WHEN '<3s' THEN 1 WHEN '3–7s' THEN 2 WHEN '7–15s' THEN 3
  WHEN '15s+' THEN 4 ELSE 5 END;
```

Do not interpret a speed/accuracy association as “thinking longer causes a
miss.” Harder questions naturally take longer.

## Empirical forgetting curve

Grain: one repeat exposure, bucketed by whole days since the previous exposure
to the same question.

```sql
WITH sequenced AS (
  SELECT
    a.user_id,
    a.question_id,
    a.attempted_at,
    a.is_correct,
    LAG(a.attempted_at) OVER (
      PARTITION BY a.user_id, a.question_id
      ORDER BY a.attempted_at, a.id
    ) AS previous_attempted_at
  FROM attempts AS a
  WHERE a.user_id = :user_id
), delays AS (
  SELECT
    is_correct,
    CAST(julianday(attempted_at) - julianday(previous_attempted_at) AS INTEGER)
      AS days_since_previous
  FROM sequenced
  WHERE previous_attempted_at IS NOT NULL
)
SELECT
  CASE
    WHEN days_since_previous = 0 THEN 'same day'
    WHEN days_since_previous <= 2 THEN '1–2 days'
    WHEN days_since_previous <= 7 THEN '3–7 days'
    WHEN days_since_previous <= 30 THEN '8–30 days'
    ELSE '31+ days'
  END AS delay_band,
  COUNT(*) AS attempts,
  ROUND(AVG(is_correct) * 100.0, 1) AS recall_pct
FROM delays
GROUP BY delay_band
ORDER BY MIN(days_since_previous);
```

This is observational and subject to selection effects from the scheduler. For a
scheduler comparison, evaluate prediction error and workload on future reviews,
not only this curve.

## Due queue and workload

```sql
SELECT
  CASE
    WHEN datetime(css.due_at) <= datetime('now') THEN 'due'
    WHEN datetime(css.due_at) <= datetime('now', '+1 day') THEN 'next 24h'
    WHEN datetime(css.due_at) <= datetime('now', '+7 days') THEN 'next 7d'
    ELSE 'later'
  END AS due_window,
  COUNT(*) AS cards
FROM card_scheduler_state AS css
JOIN study_cards AS c ON c.id = css.card_id
WHERE css.user_id = :user_id
  AND c.status <> 'suspended'
GROUP BY due_window
ORDER BY CASE due_window
  WHEN 'due' THEN 1 WHEN 'next 24h' THEN 2
  WHEN 'next 7d' THEN 3 ELSE 4 END;
```

## Recommendation components

The serving table exposes the current estimate; joining `topics` keeps the
editorial weight visible.

```sql
SELECT
  t.name AS topic,
  t.importance_weight,
  ute.mastery,
  ute.coverage,
  ute.opportunity,
  ute.attempt_count,
  ute.updated_at
FROM user_topic_estimates AS ute
JOIN topics AS t ON t.id = ute.topic_id
WHERE ute.user_id = :user_id
ORDER BY ute.opportunity DESC, t.sort_order;
```

For MVP analysis, recompute the documented proxy from source columns and compare
it with the cached value:

```sql
SELECT
  t.slug,
  ute.opportunity AS cached_opportunity,
  ROUND(
    MIN(100.0, MAX(0.0,
      100.0 * t.importance_weight * (1.0 - ute.mastery)
      * (0.65 + 0.35 * (1.0 - ute.coverage))
    )),
    3
  ) AS recomputed_opportunity
FROM user_topic_estimates AS ute
JOIN topics AS t ON t.id = ute.topic_id
WHERE ute.user_id = :user_id;
```

Mastery is the Beta(1,1)-smoothed posterior accuracy multiplied by `0.35 + 0.65
× sqrt(coverage)`. When the scoring formula changes, analyze by policy version
rather than mixing incomparable scores. See [Learning
engine](LEARNING_ENGINE.md) for the full frequency × gap × game-value method and
the MVP proxy.

## XP reconciliation

This check should return zero for every learner after committed transactions:

```sql
SELECT
  u.id AS user_id,
  u.xp_total AS cached_xp,
  COALESCE(SUM(x.amount), 0) AS ledger_xp,
  u.xp_total - COALESCE(SUM(x.amount), 0) AS difference
FROM users AS u
LEFT JOIN xp_ledger AS x ON x.user_id = u.id
GROUP BY u.id, u.xp_total
HAVING difference <> 0;
```

## Content/provenance quality

Find active catalog questions without a direct or inherited source:

```sql
SELECT
  q.id,
  t.slug AS topic,
  ku.slug AS knowledge_unit,
  q.is_user_created
FROM questions AS q
JOIN topics AS t ON t.id = q.topic_id
JOIN knowledge_units AS ku ON ku.id = q.knowledge_unit_id
LEFT JOIN sources AS qs ON qs.id = q.source_id
LEFT JOIN sources AS ks ON ks.id = ku.source_id
WHERE q.is_active = 1
  AND qs.id IS NULL
  AND ks.id IS NULL;
```

An empty result is the desired state for shipped/imported content. A private
user-created draft may have provisional provenance, but it must not enter a
shared seed/export without review.

## Export contract

Exports are learner-scoped, UTF-8, and versioned. CSV is a denormalized attempt
fact view for notebooks; JSON wraps the same rows with learner and scoring
metadata. An export must not contain another learner's rows.

### Attempts CSV

`GET /api/export/attempts.csv` returns one row per attempt with this version 1
column order:

```text
export_schema_version, scheduler_version, attempt_id, client_attempt_id,
attempted_at, topic_id, topic_slug, topic_name, card_id, question_id,
knowledge_unit_id, difficulty, clue_value, prompt, raw_answer,
normalized_answer, canonical_answer, is_correct, match_type, rating,
confidence, confidence_probability, confidence_provided, hint_used,
response_ms, mode, xp_awarded, previous_ease_factor, new_ease_factor,
previous_interval_days, new_interval_days, previous_due_at, new_due_at,
source_title, source_url, source_id, source_license
```

Raw answers are included for a learner's private export but should be removed or
pseudonymized before sharing a portfolio dataset. Do not include email in every
fact row.

CSV rules:

- header row required;
- RFC 4180-style quoting for commas, quotes, and newlines;
- booleans serialized consistently as `0/1` or `true/false` and documented;
- UTC ISO-8601 timestamps;
- empty string for absent optional scalar values, never the word `undefined`;
- stable column order within a schema version.

### Attempts JSON

`GET /api/export/attempts.json` wraps camelCase versions of the same rows:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-07-19T12:00:00.000Z",
  "schedulerVersion": "clue-atlas-sm2-v1",
  "user": {
    "id": "user_example",
    "displayName": "Example learner",
    "email": "learner@example.invalid"
  },
  "confidenceScale": { "low": 0.4, "medium": 0.65, "high": 0.85 },
  "attempts": []
}
```

`attempts` may be empty, but declared envelope keys remain present. A fuller
relational backup containing standalone topic, knowledge-unit, question,
estimate, and source arrays is roadmap—not part of export schema version 1.
Large exports may move to newline-delimited JSON in a later version.

### Current MVP access

The MVP exposes learner-scoped CSV and JSON routes and the Data Lab can link to
them. They depend on a working D1 binding and trusted learner identity. Without
those, the client may fall back to an ephemeral demo and must not imply that a
download is a durable backup. Use the notebook's synthetic sample for a public
portfolio until you have deliberately de-identified your own export.

## Suggested portfolio questions

- Which categories combine low mastery with high editorial/game value?
- Does confidence become better calibrated over time?
- Which cards lapse after an `easy` rating, and were those responses hinted?
- Is the current interval policy overloading particular weekdays?
- How do first-exposure accuracy and review accuracy diverge by category?
- Can response time improve without reducing accuracy?
- How sensitive are opportunity rankings to the frequency prior?
- Does a policy trained on broad trivia transfer poorly to technical concepts?

The lightweight [opportunity-score walkthrough](../notebooks/README.md) uses
synthetic data so it is safe to publish and easy to reproduce.
