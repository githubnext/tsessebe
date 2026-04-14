"""Benchmark: Series.isin(values) on 100k Series with 100-element lookup set."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series(np.arange(SIZE) % 500)
lookup = list(range(0, 500, 5))
for _ in range(WARMUP): s.isin(lookup)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.isin(lookup)
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_isin", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
