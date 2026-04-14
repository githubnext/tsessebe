"""Benchmark: Series boolean selection on 100k Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE))
mask = pd.Series(np.arange(SIZE) % 2 == 0)
for _ in range(WARMUP): s[mask]

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s[mask]
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_filter", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
