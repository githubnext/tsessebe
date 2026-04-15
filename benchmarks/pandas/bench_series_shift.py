"""Benchmark: series_shift — shift values by 1 position in a 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

data = np.arange(ROWS, dtype=np.float64)
s = pd.Series(data)

for _ in range(WARMUP):
    s.shift(1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.shift(1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_shift",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
