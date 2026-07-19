# Contributing to Clue Atlas

Thank you for helping make broad learning more deliberate, playful, and
inspectable. Clue Atlas welcomes focused contributions to code, design,
curriculum, original content, analysis, accessibility, and documentation.

By participating, follow the [Code of Conduct](CODE_OF_CONDUCT.md). For private
security reports, use [SECURITY.md](SECURITY.md) rather than a public issue.

## Before starting

- Search existing issues and pull requests.
- Use a feature request for a product change and a data/content issue for a
  factual, attribution, ambiguity, or rights concern.
- For a large schema, scheduler, recommendation, authentication, or content-
  licensing change, open a proposal before implementation.
- Keep pull requests single-purpose. A content pack and scheduler refactor should
  not arrive in the same review.

## Development setup

Requirements:

- Node.js `>=22.13.0`
- pnpm, preferably enabled through Corepack

```bash
corepack enable
pnpm install
pnpm dev
```

Before opening a pull request:

```bash
pnpm lint
pnpm build
pnpm test
```

The scripts also work through npm, but CI uses pnpm and the frozen pnpm lockfile.
Use one package manager consistently and do not update a lockfile without a
dependency reason.

## Contribution paths

### Application and learning engine

- Keep scheduler and recommendation logic in testable domain functions, not UI
  components.
- Pass explicit timestamps to time-sensitive logic so tests are deterministic.
- Preserve attempt idempotency and the fact/projection boundary described in
  [the data model](docs/DATA_MODEL.md).
- Add regression tests for answer normalization, scheduling transitions, retries,
  projection rebuilds, and authorization boundaries as applicable.
- Never weaken input validation to make a UI demo pass.

### Schema and migrations

1. Update `db/schema.ts`.
2. Generate a migration with `pnpm db:generate`.
3. Review the SQL and test it against representative data.
4. Update the data dictionary and export schema when semantics change.
5. Include a backfill/rollback note for destructive or long-running changes.

Do not edit an already applied migration to hide a later change.

### Original content and curriculum

Read [Data sources & licensing](docs/DATA_SOURCES.md) first. Shared seed content
must be original, public domain, or under a clearly compatible license. This
repository accepts original shared seed contributions under `CC0-1.0` so the
learning dataset remains portable. Code and documentation remain under the
repository's MIT license.

A content pull request must:

- identify source and license records;
- state whether wording is original and who reviewed it;
- include canonical answers and justified aliases;
- avoid time-sensitive claims without an “as of” date;
- pass duplicate and ambiguity review;
- explain any unusual difficulty, importance, or game-value assignment; and
- contain no copied game-show/archive clues or archive-scraping code.

By submitting original seed content for inclusion, you represent that you have
the right to contribute it and agree that it may be distributed under
`CC0-1.0`. Do not submit employer/client material or private study sets without
permission.

### Data science and notebooks

- Publish only synthetic, consented, or properly de-identified data.
- State the dataset grain and filters near every analysis.
- Use time-aware evaluation for learning predictions.
- Keep notebooks small and reproducible; clear large cell output and generated
  binaries before committing.
- Separate descriptive findings from causal claims.
- Add dependencies deliberately; the default walkthrough uses the Python
  standard library.

### Design and accessibility

- Maintain keyboard access and visible focus.
- Preserve usable layout at 200% zoom and narrow mobile widths.
- Do not encode state by color alone.
- Respect reduced motion and configurable/disabled timers.
- Pair visual phrase clouds and charts with ranked text/tables.
- Do not reduce rewards or streak credit because accessibility options are used.

### Documentation

Update the relevant guide when behavior, schema, formulas, setup, deployment, or
data policy changes. Mark roadmap ideas as roadmap; do not document mock/demo
state as durable production behavior.

## Pull request checklist

- [ ] The change has one clear purpose and references an issue when applicable.
- [ ] I ran lint, build, and tests on Node 22.
- [ ] I added or updated tests proportional to the risk.
- [ ] I updated user/developer/data documentation where behavior changed.
- [ ] Schema changes include reviewed migrations and export impact.
- [ ] New content has source/license metadata and original-wording review.
- [ ] I tested keyboard, focus, responsive, and reduced-motion behavior for UI
      changes.
- [ ] I included no secrets, user exports, production database files, or large
      generated output.
- [ ] I disclosed material AI-assisted generation and performed human factual,
      license, security, and similarity review.

## Commit and review guidance

Use concise imperative commit messages, for example:

```text
Add confidence fields to attempt export
```

Reviewers should be able to verify a change without reconstructing hidden state.
Include screenshots for visual changes, sample request/response or export rows
for contract changes, and before/after query plans only when performance is the
claim.

Maintainers may ask to split a pull request, remove inadequately licensed
content, add a migration, or replace real learner data with synthetic fixtures.

## Reporting content problems

Use the **Data/content issue** template for an incorrect answer, ambiguous clue,
missing attribution, or licensing concern. Avoid posting personal data. For a
non-public rights request, use the private path in [SECURITY.md](SECURITY.md).
