"""Benchmark: min-max normalization on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.sin(np.arange(ROWS) * 0.01) * 100 + 50
s = pd.Series(data)

for _ in range(WARMUP):
    (s - s.min()) / (s.max() - s.min())

start = time.perf_counter()
for _ in range(ITERATIONS):
    (s - s.min()) / (s.max() - s.min())
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "min_max_normalize",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
