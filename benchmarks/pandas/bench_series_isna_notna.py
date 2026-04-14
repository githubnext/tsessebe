"""Benchmark: Series.isna() and Series.notna() on 100k Series with NAs."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = np.where(np.arange(SIZE) % 3 == 0, np.nan, np.arange(SIZE, dtype=float))
s = pd.Series(data)
for _ in range(WARMUP): s.isna(); s.notna()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.isna()
    s.notna()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_isna_notna", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
