"""Benchmark: Series sort (sort_values on 100k-element numeric Series)"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

rng = np.random.default_rng(42)
data = rng.random(ROWS) * 1000
s = pd.Series(data)

for _ in range(WARMUP):
    s.sort_values()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.sort_values()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_sort",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
