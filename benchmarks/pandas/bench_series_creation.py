"""
Benchmark: Series creation

Creates a Series from a large numeric array and measures the time.
Outputs JSON: {"function": "series_creation", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50


def generate_data(n: int) -> "list[float]":
    """Generate a deterministic numeric array of the given size."""
    return [i * 1.1 + 0.5 for i in range(n)]


data = generate_data(SIZE)

# Warm-up
for _ in range(WARMUP):
    pd.Series(list(data))

# Measured runs
times: "list[float]" = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    pd.Series(list(data))
    end = time.perf_counter()
    times.append((end - start) * 1000)  # convert to ms

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

result = {
    "function": "series_creation",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}

print(json.dumps(result))
