"""Benchmark: rolling min with window=100 on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.sin(np.arange(ROWS) * 0.01)
s = pd.Series(data)

for _ in range(WARMUP):
    s.rolling(100).min()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.rolling(100).min()
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "rolling_min", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
