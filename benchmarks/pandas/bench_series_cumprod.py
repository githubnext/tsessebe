"""Benchmark: series cumprod on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

data = 1 + np.sin(np.arange(ROWS) * 0.0001) * 0.01
s = pd.Series(data)

for _ in range(WARMUP):
    s.cumprod()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.cumprod()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_cumprod",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
