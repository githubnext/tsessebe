"""pandas-side benchmark for Series.sort_values.

Output: a single JSON line on stdout with the shape
    {"function": "Series.sort_values", "mean_ms": <number>,
     "iterations": <number>, "total_ms": <number>}

Dataset shape and iteration counts mirror ./benchmark.ts — keep the two in
lockstep. Fixed seed for reproducibility across runs.
"""

from __future__ import annotations

import json
import sys
import time

import numpy as np
import pandas as pd

# Inlined from config.yaml (kept in sync with benchmark.ts).
DATASET_SIZE = 100_000
NAN_RATIO = 0.05
WARMUP_ITERATIONS = 5
MEASURED_ITERATIONS = 50
RANDOM_SEED = 42


def build_data() -> pd.Series:
    rng = np.random.default_rng(RANDOM_SEED)
    values = rng.uniform(-500_000.0, 500_000.0, size=DATASET_SIZE)
    nan_mask = rng.random(size=DATASET_SIZE) < NAN_RATIO
    values[nan_mask] = np.nan
    return pd.Series(values, dtype="float64")


def main() -> None:
    series = build_data()

    # Warm-up.
    for _ in range(WARMUP_ITERATIONS):
        series.sort_values()

    start = time.perf_counter()
    for _ in range(MEASURED_ITERATIONS):
        series.sort_values()
    total_s = time.perf_counter() - start
    total_ms = total_s * 1000.0
    mean_ms = total_ms / MEASURED_ITERATIONS

    result = {
        "function": "Series.sort_values",
        "mean_ms": mean_ms,
        "iterations": MEASURED_ITERATIONS,
        "total_ms": total_ms,
    }
    sys.stdout.write(json.dumps(result) + "\n")


if __name__ == "__main__":
    main()
