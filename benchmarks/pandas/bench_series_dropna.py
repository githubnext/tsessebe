"""Benchmark: Series.dropna() on 100k Series with ~20% NAs."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

data = np.where(np.arange(SIZE) % 5 == 0, np.nan, np.arange(SIZE, dtype=float))
s = pd.Series(data)
for _ in range(WARMUP): s.dropna()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.dropna()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_dropna", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
