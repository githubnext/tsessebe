"""Benchmark: qcut — quantile-bin 100k values into 10 quantiles"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.sin(np.arange(ROWS) * 0.01)
s = pd.Series(data)

for _ in range(WARMUP):
    pd.qcut(s, 10, duplicates="drop")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.qcut(s, 10, duplicates="drop")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "qcut",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
