"""Benchmark: nlargest on 100k-element Series (top 1000)"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.sin(np.arange(ROWS) * 0.01) * 1000
s = pd.Series(data)

for _ in range(WARMUP):
    s.nlargest(1000)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.nlargest(1000)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_nlargest",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
