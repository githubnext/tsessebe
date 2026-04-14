"""Benchmark: series cumprod on 10k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 20

data = 1 + (np.arange(ROWS) % 1000) * 0.0001
s = pd.Series(data)

for _ in range(WARMUP):
    s.cumprod()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.cumprod()
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "series_cumprod", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
