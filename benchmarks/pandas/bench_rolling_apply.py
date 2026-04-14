"""Benchmark: rolling.apply on 10k-element pandas Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
s = pd.Series([i * 0.1 for i in range(ROWS)])

for _ in range(WARMUP):
    s.rolling(10).apply(np.mean, raw=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.rolling(10).apply(np.mean, raw=True)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "rolling_apply", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
