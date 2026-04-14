"""Benchmark: Series.groupby(by).sum() on 100k Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

s = pd.Series((np.arange(SIZE) * 1.5) % 9999)
by = pd.Series(np.arange(SIZE) % 100)
for _ in range(WARMUP): s.groupby(by).sum()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.groupby(by).sum()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_groupby", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
