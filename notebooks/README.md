# Analysis notebooks

This directory contains small, publishable analyses for the Clue Atlas data
project. Examples use synthetic data by default: no learner export, proprietary
archive, or copied clue text is committed.

## Opportunity-score walkthrough

[`opportunity_score_walkthrough.py`](opportunity_score_walkthrough.py) is a
[Jupytext-style](https://jupytext.readthedocs.io/) Python notebook: `# %%` cells
work in editors that understand them, and the file also runs as a normal script
with no third-party dependencies.

```bash
python3 notebooks/opportunity_score_walkthrough.py
```

It demonstrates:

- the `attempts` event grain;
- Beta(1,1)-smoothed accuracy;
- coverage-adjusted MVP mastery and opportunity;
- the conceptual frequency × gap × game-value research score;
- confidence mapping and a Brier-derived calibration score;
- an equivalent SQLite aggregation; and
- a CSV-ready result written to standard output.

Replace `SYNTHETIC_ATTEMPTS` only with your own learner-scoped export. Never
commit a real export: it may contain raw answers, response time, confidence, and
other personal learning data.

## Notebook rules

- State the grain and population.
- Keep raw facts separate from derived features.
- Use chronological splits for prediction.
- Report sample size and uncertainty.
- Clear large output before committing.
- Use only original, clearly licensed, synthetic, or consented data.
- Distinguish descriptive results from causal claims.

