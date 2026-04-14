"""Benchmark: Series.describe() — summary statistics on 100k Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

s = pd.Series((np.arange(SIZE) * 1.1) % 9999)
for _ in range(WARMUP): s.describe()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.describe()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_describe", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
