"""Benchmark: rolling count with window=100 on 100k-element Series (with NaNs)"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.where(np.arange(ROWS) % 10 == 0, np.nan, np.arange(ROWS, dtype=float))
s = pd.Series(data)

for _ in range(WARMUP):
    s.rolling(100).count()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.rolling(100).count()
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "rolling_count", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
