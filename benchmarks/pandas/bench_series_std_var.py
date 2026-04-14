"""Benchmark: Series.std() and Series.var() on 100k numeric Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series((np.arange(SIZE) * 2.71) % 10000)
for _ in range(WARMUP): s.std(); s.var()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.std(); s.var()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_std_var", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
