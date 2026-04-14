"""Benchmark: zscore normalization on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.sin(np.arange(ROWS) * 0.01) * 100 + 50
s = pd.Series(data)

for _ in range(WARMUP):
    (s - s.mean()) / s.std()

start = time.perf_counter()
for _ in range(ITERATIONS):
    (s - s.mean()) / s.std()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "zscore",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
