"""Benchmark: Series natural logarithm — np.log / Series.apply(np.log) on 100k-element Series."""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(1, ROWS + 1, dtype=float))

for _ in range(WARMUP):
    np.log(s)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.log(s)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_log_natural",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
