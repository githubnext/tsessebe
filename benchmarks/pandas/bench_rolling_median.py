"""Benchmark: rolling median with window=50 on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 2
ITERATIONS = 5

data = np.sin(np.arange(ROWS) * 0.01)
s = pd.Series(data)

for _ in range(WARMUP):
    s.rolling(50).median()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.rolling(50).median()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "rolling_median",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
