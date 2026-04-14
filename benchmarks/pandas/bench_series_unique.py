"""Benchmark: Series.unique() on 100k-element Series with 1000 distinct values."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series(np.arange(SIZE) % 1000)
for _ in range(WARMUP): s.unique()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.unique()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_unique", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
