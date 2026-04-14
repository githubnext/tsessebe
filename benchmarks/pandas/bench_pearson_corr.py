"""Benchmark: Pearson correlation between two 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

a = np.sin(np.arange(ROWS) * 0.01)
b = np.cos(np.arange(ROWS) * 0.01)
sa = pd.Series(a)
sb = pd.Series(b)

for _ in range(WARMUP):
    sa.corr(sb)

start = time.perf_counter()
for _ in range(ITERATIONS):
    sa.corr(sb)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pearson_corr",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
