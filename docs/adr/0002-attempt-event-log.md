# ADR 0002: Attempts as the canonical learning event

- Status: Accepted
- Date: 2026-07-19

## Context

The UI needs fast current state—due cards, mastery, XP, and achievements—while the
data project needs trustworthy history. Keeping only aggregates would make
scheduler evaluation, confidence analysis, corrections, and reproducible exports
impossible. Recomputing every product view from a raw log on each request would
be unnecessarily slow.

## Decision

`attempts` is the canonical behavioral fact at the grain of one learner's final
evaluated response to one question at one time. It is append-only and idempotent
by learner plus client attempt ID.

Each scheduler transition is preserved in `card_review_log`; each reward is
preserved in `xp_ledger`. Current scheduler state, user totals, achievements, and
topic estimates are transactional projections for product reads.

Facts are preserved when content is deactivated. If a projection disagrees with
the event log, repair or rebuild the projection rather than altering facts.

## Consequences

### Positive

- Retries cannot double-advance a card or award XP twice.
- Scheduler and recommendation policies can be evaluated retrospectively.
- CSV/JSON exports have a stable, documented grain.
- Current product pages do not require expensive full-history queries.

### Costs

- Write transactions touch several related tables.
- Projection reconciliation and migration tests are required.
- Raw responses and confidence require clear privacy/deletion policy.

## Rejected alternatives

- **Only store current card state:** loses learning history and auditability.
- **Only store events:** makes common serving reads more complex and expensive.
- **Treat page views as attempts:** pollutes learning evidence with non-responses.
