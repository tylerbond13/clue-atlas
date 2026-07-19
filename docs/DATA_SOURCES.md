# Data sources & licensing

Clue Atlas treats content provenance as part of the product, not paperwork to add
later. A useful learning dataset must also be lawful to publish, inspect, remix,
and export.

## Non-negotiable rule

Shipped seed/imported content must be either:

1. written originally for Clue Atlas and contributed under a compatible license;
2. clearly marked public domain; or
3. reused under an explicit license that permits this project's copying,
   adaptation, redistribution, and intended use, with every condition preserved.

“Available on the internet,” “educational,” and “no copyright notice” are not
licenses.

## J! Archive boundary

Clue Atlas does **not** include, build, or endorse a J! Archive scraper. The
repository must not contain an archive mirror, copied clue corpus, derived
question dump, or a script whose purpose is to create one.

[Colin Davy's
article](https://colindavy.medium.com/how-i-won-jeopardy-with-data-science-c2e9b52a1958)
is cited as inspiration for a method—identify recurring knowledge and compress
high-information associations. Citing the method does not grant rights to the
source material he analyzed. Clue Atlas applies the idea only to original or
clearly licensed content and learner-generated attempt data.

Do not copy a show's clue wording, board, category set, branding, or answer bank.
This project is not affiliated with or endorsed by Jeopardy Productions, Inc.,
Sony Pictures, or J! Archive.

## Facts are not clue text

Many basic facts can be researched from multiple references, but the selection
and wording of a clue can be protected expression. The safe authoring path is:

1. verify the fact with a reliable source;
2. close the source;
3. write a clear prompt and explanation in your own structure and voice;
4. compare against the source to remove accidental copying;
5. record the factual reference and the license/status of any incorporated
   material;
6. have another contributor review ambiguity and provenance.

Changing a few words in a copied clue is not original authoring.

## Initial seed

The starter catalog is hand-written for Clue Atlas and contains stable factual
associations rather than copied game-show clues. Its source record identifies it
as `CC0-1.0`. The separate reference to Colin Davy's article supports the product
method only; article text and images are not included as content.

The seed is deliberately small. Its purpose is to exercise the learning model
across trivia and Data Studio topics, not to imply comprehensive coverage.

## License intake guide

This is a contribution policy, not legal advice. When rights are uncertain, do
not import the material.

| Source status | Default decision | Notes |
| --- | --- | --- |
| Contributor's original work | Accept with declaration | Contributor must have the right to license it |
| CC0 / equivalent dedication | Accept | Record the canonical license URL and attribution if requested |
| Public domain | Review, then accept | Record why and in which jurisdiction/status; media may differ from text |
| CC BY | Review, then accept | Preserve creator, title, source, license link, and modification notice |
| CC BY-SA | Escalate before import | Share-alike obligations can affect the dataset/distribution |
| CC BY-NC or other noncommercial license | Do not ship by default | Incompatible with unrestricted downstream use goals |
| CC BY-ND or no-derivatives license | Do not adapt | Question authoring is normally an adaptation |
| Unknown/custom terms | Do not import | Obtain permission or choose another source |
| User's private notes | Allow only as private content | Do not publish or include in shared analytics without rights/consent |

Media needs separate review. An article may be licensed while its photographs,
maps, recordings, or embedded artwork are not.

## Source manifest

Every shared import or seed batch should have a machine-readable manifest or
equivalent reviewed records containing:

```json
{
  "dataset_id": "example-original-pack-v1",
  "title": "Example original pack",
  "creator": "Contributor name or project",
  "source_url": null,
  "license": "CC0-1.0",
  "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
  "accessed_at": "2026-07-19",
  "modified": true,
  "attribution": "",
  "reviewer": "reviewer handle",
  "notes": "Prompts and explanations written for Clue Atlas."
}
```

At runtime, `sources` stores the essential title, URL, author, license, notes,
and access date. A future import manifest can retain additional batch/version and
review fields without weakening the runtime link.

License strings should use [SPDX identifiers](https://spdx.org/licenses/) when
one exists, for example `CC0-1.0` or `CC-BY-4.0`. A source row with `license =
NULL` is acceptable for a methodology citation that contributes no reusable
content; it is not acceptable evidence for copied seed questions.

## Content review checklist

- Prompt and explanation are original or their reuse license is verified.
- Canonical answer and aliases are factually correct.
- The question asks for one defensible answer at its stated time.
- Time-sensitive claims have an “as of” date or review/retirement plan.
- The explanation adds useful context without copying a source.
- Topic, difficulty, importance, and game value are reasonable.
- Signal phrases are concise factual associations, not extracted protected text.
- Source and license records are complete.
- Duplicate fingerprint and semantic-near-duplicate checks pass.
- Names, cultures, religions, and disputed claims are handled respectfully.
- Image/audio rights and accessible alternatives are reviewed separately.

## Generated content

Machine-generated drafts are not automatically licensed, accurate, or original.
If generation is added later:

- record that the draft was generated and which process/version produced it;
- prohibit prompts that ask a model to imitate or transform a proprietary corpus;
- require human factual, ambiguity, bias, and similarity review;
- verify every cited source independently;
- do not let generated drafts bypass duplicate or license checks;
- retain reviewer and approval metadata.

Generated volume must not outrun editorial capacity.

## Learner-created content

Private custom material may contain notes the learner can lawfully use but cannot
redistribute. Keep private content scoped to its owner, mark it as user-created,
and exclude it from public seeds/community packs by default. A later sharing flow
must obtain an explicit license/rights declaration rather than inferring consent
from upload.

## Corrections and takedowns

Report a factual, attribution, or rights issue using the **Data/content issue**
template. For a sensitive or non-public rights request, follow
[SECURITY.md](../SECURITY.md)'s private reporting path and label the report as a
content rights concern.

Maintainers should:

1. deactivate disputed content from future selection;
2. preserve stable keys and historical learner facts where legally appropriate;
3. investigate the source and affected derivatives;
4. correct, replace, or remove the content and attribution;
5. document the decision and notify the reporter;
6. check exports, caches, releases, and backups for follow-up obligations.

Do not rewrite historical attempt rows merely because a question is retired.
