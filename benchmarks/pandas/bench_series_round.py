"""Benchmark: series round (2 decimals) on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

data = np.sin(np.arange(ROWS) * 0.01) * 1000
s = pd.Series(data)

for _ in range(WARMUP):
    s.round(2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.round(2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_round",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
