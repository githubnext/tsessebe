"""Benchmark: Series.copy() on 100k Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE) * 0.5, name="original")
for _ in range(WARMUP): s.copy()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.copy()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_copy", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
