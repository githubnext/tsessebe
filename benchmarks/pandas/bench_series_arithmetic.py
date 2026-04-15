"""Benchmark: Series arithmetic (add + multiply on 100k-element Series)"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

data = np.arange(ROWS, dtype=np.float64) * 0.5
s = pd.Series(data)

for _ in range(WARMUP):
    (s + 2.0) * 0.5

start = time.perf_counter()
for _ in range(ITERATIONS):
    (s + 2.0) * 0.5
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_arithmetic",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
