"""Benchmark: cut (bin into 10 bins) on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = (np.arange(ROWS) % 10000) * 0.01
s = pd.Series(data)

for _ in range(WARMUP):
    pd.cut(s, 10)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.cut(s, 10)
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "cut", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
