# %% [markdown]
# # Clue Atlas: opportunity-score walkthrough
#
# Safe, standard-library-only example over synthetic attempt events. The grain of
# `SYNTHETIC_ATTEMPTS` is one learner's evaluated response to one question at one
# timestamp. Rows are deliberately tiny and contain no clue text or personal data.

# %%
from __future__ import annotations

import csv
import io
import math
import sqlite3
from collections import defaultdict


CONFIDENCE_PROBABILITY = {"low": 0.40, "medium": 0.65, "high": 0.85}

# `importance` is the MVP proxy that jointly represents frequency/game value.
# The separate priors are included to demonstrate the longer-term research score.
TOPICS = {
    "geography": {
        "active_questions": 10,
        "importance": 1.00,
        "frequency_prior": 0.90,
        "game_value": 0.85,
    },
    "mythology": {
        "active_questions": 8,
        "importance": 0.85,
        "frequency_prior": 0.72,
        "game_value": 0.90,
    },
    "science": {
        "active_questions": 10,
        "importance": 0.95,
        "frequency_prior": 0.82,
        "game_value": 0.80,
    },
    "statistics": {
        "active_questions": 8,
        "importance": 0.70,
        "frequency_prior": 0.55,
        "game_value": 0.70,
    },
}

SYNTHETIC_ATTEMPTS = [
    ("geography", "geo-1", 1, "high", 2_800),
    ("geography", "geo-2", 1, "medium", 4_100),
    ("geography", "geo-3", 0, "high", 6_400),
    ("geography", "geo-1", 1, "high", 2_100),
    ("mythology", "myth-1", 0, "medium", 8_000),
    ("mythology", "myth-2", 0, "low", 10_500),
    ("mythology", "myth-3", 0, "high", 6_200),
    ("science", "sci-1", 1, "medium", 5_500),
    ("science", "sci-2", 0, "medium", 7_600),
    ("science", "sci-3", 1, "high", 3_700),
    ("science", "sci-4", 0, "low", 9_100),
    ("statistics", "stat-1", 1, "high", 4_800),
    ("statistics", "stat-2", 1, "medium", 6_100),
    ("statistics", "stat-3", 0, "medium", 8_800),
]


# %% [markdown]
# ## Mirror the MVP projection
#
# `mastery` tempers smoothed accuracy when coverage is sparse. `opportunity`
# favors important topics with a large gap and gives a modest exploration bonus
# to categories with low coverage.

# %%
def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return min(high, max(low, value))


def summarize_attempts(attempts: list[tuple]) -> list[dict[str, object]]:
    grouped: dict[str, list[tuple]] = defaultdict(list)
    for row in attempts:
        grouped[row[0]].append(row)

    results: list[dict[str, object]] = []
    for topic, metadata in TOPICS.items():
        rows = grouped[topic]
        attempt_count = len(rows)
        correct_count = sum(row[2] for row in rows)
        distinct_questions = len({row[1] for row in rows})
        coverage = clamp(distinct_questions / metadata["active_questions"])
        posterior_accuracy = (correct_count + 1) / (attempt_count + 2)
        mastery = clamp(
            posterior_accuracy * (0.35 + 0.65 * math.sqrt(coverage))
        )
        coverage_uncertainty = 0.65 + 0.35 * (1 - coverage)
        mvp_opportunity = clamp(
            metadata["importance"]
            * (1 - mastery)
            * coverage_uncertainty
        ) * 100

        # Research candidate: split the editorial proxy into inspectable inputs.
        full_opportunity = (
            metadata["frequency_prior"]
            * (1 - mastery)
            * metadata["game_value"]
            * 100
        )

        brier = sum(
            (CONFIDENCE_PROBABILITY[row[3]] - row[2]) ** 2 for row in rows
        ) / attempt_count

        results.append(
            {
                "topic": topic,
                "attempts": attempt_count,
                "distinct_questions": distinct_questions,
                "coverage": round(coverage, 3),
                "posterior_accuracy": round(posterior_accuracy, 3),
                "mastery": round(mastery, 3),
                "mvp_opportunity": round(mvp_opportunity, 1),
                "frequency_gap_game_value": round(full_opportunity, 1),
                "brier_derived_calibration": round(1 - brier, 3),
            }
        )

    return sorted(results, key=lambda row: (-row["mvp_opportunity"], row["topic"]))


summary = summarize_attempts(SYNTHETIC_ATTEMPTS)


# %% [markdown]
# ## Verify the basic aggregates in SQLite
#
# Keeping the SQL result next to the Python feature calculation makes grain and
# join mistakes easier to spot before moving an analysis into a dashboard.

# %%
connection = sqlite3.connect(":memory:")
connection.execute(
    """
    CREATE TABLE attempts (
      topic TEXT NOT NULL,
      question_id TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      confidence TEXT NOT NULL,
      response_ms INTEGER
    )
    """
)
connection.executemany(
    "INSERT INTO attempts VALUES (?, ?, ?, ?, ?)", SYNTHETIC_ATTEMPTS
)

sql_counts = {
    row[0]: {"attempts": row[1], "distinct_questions": row[2], "correct": row[3]}
    for row in connection.execute(
        """
        SELECT topic, COUNT(*), COUNT(DISTINCT question_id), SUM(is_correct)
        FROM attempts
        GROUP BY topic
        """
    )
}

for row in summary:
    assert sql_counts[row["topic"]]["attempts"] == row["attempts"]
    assert sql_counts[row["topic"]]["distinct_questions"] == row["distinct_questions"]

connection.close()


# %% [markdown]
# ## Emit a portable table
#
# The real application export is learner-scoped and versioned. This notebook
# writes only its derived synthetic table to stdout.

# %%
buffer = io.StringIO()
writer = csv.DictWriter(buffer, fieldnames=list(summary[0]))
writer.writeheader()
writer.writerows(summary)
print(buffer.getvalue().strip())
