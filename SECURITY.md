# Security policy

## Supported versions

Clue Atlas is an early MVP. Security fixes are applied to the current `main`
branch; older snapshots and forks are not supported.

| Version | Supported |
| --- | --- |
| Current `main` | Yes |
| Older commits/releases | No |

## Report a vulnerability

Please do not open a public issue for a suspected vulnerability or include
working exploit details in a discussion.

Use the repository's **Security → Report a vulnerability** private reporting
form. Include:

- the affected commit, route, or component;
- a concise impact statement;
- reproducible steps or a minimal proof of concept;
- required privileges and whether learner data is exposed;
- suggested mitigation, if known;
- how you would like to be credited.

If GitHub private vulnerability reporting is unavailable, contact the repository
owner privately through their verified GitHub profile and ask for a secure
channel without sending exploit details in the first message.

Maintainers aim to acknowledge a report within three business days and provide
an initial triage assessment within seven. These are targets, not guarantees for
a volunteer project. Please allow a reasonable remediation window before public
disclosure.

## In scope

- authentication or learner-isolation failures;
- access to another learner's attempts, raw answers, exports, or Studio content;
- SQL injection or unsafe database binding;
- duplicate-attempt races that corrupt state or rewards;
- stored/reflected cross-site scripting in prompts, explanations, or display
  names;
- CSV formula injection or unsafe export handling;
- secrets in source, builds, logs, or error responses;
- dependency or Worker configuration issues with a credible exploit path;
- destructive import, deletion, or migration behavior.

Factual mistakes, ambiguous questions, attribution gaps, and content-rights
concerns normally use the private path in [Data sources &
licensing](docs/DATA_SOURCES.md) or the public data/content template when no
sensitive information is involved.

## Out of scope

- automated scans without a demonstrated impact;
- denial-of-service stress testing;
- social engineering, spam, or attacks on contributors;
- vulnerabilities that require a victim to run a visibly malicious fork;
- reports against third-party services with no Clue Atlas-specific issue;
- trivia answer disagreements without a security or privacy consequence.

Do not access, modify, or retain data that is not yours. Stop testing and report
immediately if you encounter another learner's information.

## Security expectations for contributors

- Never commit `.env` files, tokens, database IDs, production dumps, or learner
  exports.
- Use parameterized queries and server-side authorization on every learner-scoped
  read/write/export.
- Preserve attempt idempotency and transactional scheduler/reward updates.
- Escape learner/content text in HTML and neutralize spreadsheet formulas in CSV
  cells where needed.
- Avoid logging emails, raw answers, confidence values, prompts, or full request
  bodies.
- Review generated migrations and dependency changes.
- Use synthetic fixtures in tests and notebooks.

There is currently no bug-bounty program or promise of payment.
