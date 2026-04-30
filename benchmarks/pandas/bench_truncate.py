"""Benchmark: truncate on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.arange(ROWS) * 0.5
s = pd.Series(data, index=np.arange(ROWS))

for _ in range(WARMUP):
    s.truncate(before=10_000, after=90_000)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.truncate(before=10_000, after=90_000)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "truncate",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
