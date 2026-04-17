"""Benchmark: Series.set_axis() and Series.reset_index() — reassign or reset the
row-index of a 100k-element Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = np.arange(SIZE, dtype=float) * 1.5
s = pd.Series(data)
new_index = pd.Index(np.arange(SIZE) * 2)

for _ in range(WARMUP):
    s.set_axis(new_index)
    s.reset_index(drop=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.set_axis(new_index)
    s.reset_index(drop=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_set_reset_index",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
