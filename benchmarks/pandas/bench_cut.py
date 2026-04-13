"""Benchmark: cut — bin 100k values into 10 equal-width bins"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.arange(ROWS, dtype=np.float64) % 100
s = pd.Series(data)
bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

for _ in range(WARMUP):
    pd.cut(s, bins)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.cut(s, bins)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "cut",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
