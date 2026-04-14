"""Benchmark: Series.iloc[] — integer position selection on 100k Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series(np.arange(SIZE) * 3.0)
positions = list(range(0, SIZE, 100))
for _ in range(WARMUP): s.iloc[positions]

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.iloc[positions]
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_iloc", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
