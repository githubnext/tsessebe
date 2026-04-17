"""Benchmark: SeriesGroupBy.size() and get_group() operations."""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

values = pd.Series(np.random.random(ROWS) * 1000)
groups = pd.Series([f"g{i % 20}" for i in range(ROWS)])

for _ in range(WARMUP):
    values.groupby(groups).size()
    values.groupby(groups).get_group("g0")
    values.groupby(groups).get_group("g10")

start = time.perf_counter()
for _ in range(ITERATIONS):
    values.groupby(groups).size()
    values.groupby(groups).get_group("g0")
    values.groupby(groups).get_group("g10")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_groupby_size",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
