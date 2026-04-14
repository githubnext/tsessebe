"""Benchmark: Series.quantile(q) on 100k numeric Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

s = pd.Series((np.arange(SIZE) * 1.41) % 10000)
for _ in range(WARMUP): s.quantile(0.25); s.quantile(0.75)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.quantile(0.25)
    s.quantile(0.75)
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_quantile", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
