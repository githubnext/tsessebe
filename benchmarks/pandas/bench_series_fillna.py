"""Benchmark: series_fillna — fill NaN values in a 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

data = np.where(np.arange(ROWS) % 5 == 0, np.nan, np.arange(ROWS) * 1.1)
s = pd.Series(data)

for _ in range(WARMUP):
    s.fillna(0.0)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.fillna(0.0)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_fillna",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
