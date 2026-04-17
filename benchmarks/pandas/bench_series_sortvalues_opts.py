"""Benchmark: Series.sort_values with options — ascending=False, na_position='first'."""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

data = [None if i % 1000 == 0 else (np.random.random() * 10000 - 5000) for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.sort_values(ascending=False)
    s.sort_values(ascending=True, na_position="first")
    s.sort_values(ascending=False, na_position="first")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.sort_values(ascending=False)
    s.sort_values(ascending=True, na_position="first")
    s.sort_values(ascending=False, na_position="first")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_sortvalues_opts",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
