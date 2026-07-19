# HTTP API

The MVP exposes a small same-origin JSON API plus learner-scoped CSV/JSON
exports. It is designed for the Clue Atlas UI, not as a stable public third-party
API. Contract changes should update this file and increment the export schema
version when applicable.

## Identity and safety

Hosted requests use the trusted `oai-authenticated-user-email` header and the
optional encoded full-name header provided by the hosting identity layer. Client
code must not be allowed to choose a `user_id` in a request body or query string.

When no identity header exists, the MVP resolves a fixed **Local Explorer**. That
fallback exists only for local development. On a shared or public deployment,
all anonymous requests would otherwise share one learner's state. Production
must require trusted identity/access policy or disable/isolate anonymous durable
writes and exports.

All endpoints initialize/check the database and starter catalog before serving,
return `cache-control: no-store`, and scope learner-owned reads/writes to the
resolved identity.

Errors use:

```json
{ "ok": false, "error": "Human-readable message." }
```

## `GET /api/bootstrap`

Returns the current application snapshot:

- learner profile, XP, level, streak, total attempts, and accuracy;
- today's due/new/review/XP counts and goal progress;
- topic accuracy, mastery, coverage, opportunity, confidence, calibration, and
  queue counts;
- due, new, combined study queues, and the broader diagnostic question pool;
- recent attempts;
- aggregate catalog/card/attempt counts;
- achievement progress; and
- scheduler version and accepted rating values.

The question DTO includes its topic, prompt, accepted answers, explanation,
difficulty, value, Signal Card cues, card status, and due time. The API currently
returns answers in the same bootstrap used by the client, so it is a study/game
application contract—not a secure competitive-exam delivery system.

## `POST /api/attempt`

Records one evaluated response, advances the scheduler, updates topic estimates,
awards idempotent XP, and evaluates achievements.

```json
{
  "clientAttemptId": "browser-generated-idempotency-key",
  "questionId": "question_id",
  "answer": "learner response or empty string for a pass",
  "rating": "good",
  "confidence": "medium",
  "hintUsed": false,
  "responseMs": 5200,
  "mode": "review"
}
```

| Field | Required | Contract |
| --- | --- | --- |
| `clientAttemptId` | Yes | Non-empty, ≤120 characters; unique for this learner/action |
| `questionId` | Yes | Non-empty, ≤160 characters; must be visible to this learner |
| `answer` | Yes | String, including empty pass, ≤500 characters |
| `rating` | No | `again`, `hard`, `good`, or `easy`; inferred when absent |
| `confidence` | No | `low`, `medium`, or `high`; explicit capture is preferred |
| `hintUsed` | No | Boolean, defaults false |
| `responseMs` | No | Integer `0–3,600,000` |
| `mode` | No | `diagnostic`, `review`, or `play`; defaults review |

The server is authoritative. A wrong answer forces `again`; a hinted correct
answer requested as `easy` is capped at `good`. Retrying the same
`clientAttemptId` returns the original result with `idempotent: true` and does
not award more XP or advance the schedule again.

If `confidence` is omitted, the row retains a compatibility value of `medium`
but sets `confidenceProvided: false`. That observation is excluded from topic
confidence and Brier-derived calibration aggregates.

A success response includes result/adjudication, canonical and accepted answers,
explanation, effective rating, confidence/hint metadata, XP and level, streak,
next scheduler state, refreshed topic estimate, and newly unlocked achievements.

## `POST /api/questions`

Creates or returns an idempotent learner-owned custom question and initial study
card.

```json
{
  "topicSlug": "statistics",
  "prompt": "In your own words, what does a confidence interval estimate?",
  "answer": "A range from a procedure with a stated long-run coverage rate",
  "aliases": [],
  "explanation": "Interpret the confidence level as a property of the procedure.",
  "difficulty": 3,
  "pavlovCues": ["interval procedure", "long-run coverage"],
  "source": {
    "title": "Original learner-authored card",
    "url": null,
    "author": "Current learner",
    "license": null
  }
}
```

Use exactly one of `topicId` or `topicSlug` in normal clients (the server accepts
either). Limits:

- prompt ≤1,000 characters;
- answer ≤300;
- explanation ≤2,000;
- difficulty integer `1–5`;
- at most 20 aliases and 20 cues, each ≤200 characters;
- source title required when a source object is present;
- source URLs must use HTTP or HTTPS.

The endpoint returns `201` with `created: true` for a new fingerprint and `200`
with `created: false` for the learner's matching existing card. Custom content is
private to its creator in catalog queries. An optional source record does not
make private material licensed for publication; see [Data sources &
licensing](DATA_SOURCES.md).

## `GET /api/export/attempts.csv`

Downloads `clue-atlas-attempts.csv`, one row per attempt, in chronological order.
The export joins question/topic/source and scheduler-transition context. User
text is quoted and leading spreadsheet formula characters are neutralized.

## `GET /api/export/attempts.json`

Downloads `clue-atlas-attempts.json` with:

- `schemaVersion`;
- `exportedAt`;
- `schedulerVersion`;
- current learner identity;
- the confidence probability mapping; and
- an `attempts` array containing the same analytic rows as CSV.

The JSON export contains the current learner's email and both formats contain raw
answers and prompts. Treat them as private personal data. Do not commit exports
or attach them to public issues.

The exact v1 columns and analysis examples are documented in [Analytics, SQL &
exports](ANALYTICS.md).

## Local examples

With the development server running and the local-only identity fallback:

```bash
curl --fail --silent http://localhost:3000/api/bootstrap
curl --fail --silent http://localhost:3000/api/export/attempts.json
```

The actual port is the one printed by `pnpm dev`. Use browser requests in a
hosted environment so identity is supplied by the trusted platform; do not forge
identity headers as a production API pattern.

## Contract-change checklist

- Validate input before learner/content lookup that would leak details.
- Preserve learner scope and attempt idempotency.
- Keep raw observations immutable.
- Add tests for retry, wrong-answer override, and cross-learner custom content.
- Update TypeScript DTOs, this document, export fields, and notebook assumptions.
- Bump `schemaVersion` for a breaking export change.
- Keep `no-store` on learner-specific responses.
