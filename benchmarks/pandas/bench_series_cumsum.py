"""Benchmark: series_cumsum — cumulative sum on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

data = np.arange(ROWS, dtype=np.float64) * 0.001
s = pd.Series(data)

for _ in range(WARMUP):
    s.cumsum()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.cumsum()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_cumsum",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
