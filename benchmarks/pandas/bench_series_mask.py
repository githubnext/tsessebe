"""Benchmark: series mask (replace values < 0 with NaN) on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.sin(np.arange(ROWS) * 0.01)
s = pd.Series(data)
cond = s < 0

for _ in range(WARMUP):
    s.mask(cond)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.mask(cond)
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "series_mask", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
