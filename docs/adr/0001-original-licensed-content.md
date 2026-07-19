# ADR 0001: Original and clearly licensed content only

- Status: Accepted
- Date: 2026-07-19

## Context

Clue Atlas needs enough content to test diagnostics, review, play, and analytics.
Large third-party trivia archives are tempting inputs, and Colin Davy's study
story describes corpus analysis. However, public accessibility does not establish
permission to copy, transform, redistribute, or build a competing dataset.

The project should also remain credible as a public GitHub/data-science example.
Unclear lineage would undermine that goal even before considering legal risk.

## Decision

The repository ships only original content, public-domain material, or content
under a clearly compatible license with required attribution and modification
notices.

The project will not include a J! Archive scraper, corpus, copied clues, or a
derived question dump. Davy's work is a cited methodological inspiration only.
Frequency and signal analysis will operate on approved content plus learner event
data.

Each shared content item links directly or through its knowledge unit to a
`sources` record. Imports require review as described in
[`docs/DATA_SOURCES.md`](../DATA_SOURCES.md).

## Consequences

### Positive

- The seed is publishable and auditable.
- Learner exports retain meaningful lineage.
- Data-science work demonstrates responsible sourcing.
- The product can develop its own voice and curriculum.

### Costs

- Initial coverage is smaller.
- Editorial review and source manifests take time.
- Frequency estimates begin with curated priors or smaller approved corpora.

Those costs are preferable to untraceable scale. Content volume is treated as a
roadmap investment, not a shortcut.

## Rejected alternatives

- **Scrape first and remove later:** lineage and derivative artifacts would
  remain unreliable.
- **Store copied data outside Git:** the product would still depend on an
  undistributable input and be difficult to reproduce.
- **Assume educational fair use:** too context-dependent to serve as a dataset
  policy and harmful to downstream reuse.

