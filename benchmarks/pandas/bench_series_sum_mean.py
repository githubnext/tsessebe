"""Benchmark: Series.sum() and Series.mean() on 100k numeric Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE) * 0.001)
for _ in range(WARMUP): s.sum(); s.mean()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.sum(); s.mean()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_sum_mean", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
