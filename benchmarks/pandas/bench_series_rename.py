"""Benchmark: Series.rename(name) on 100k Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 10
ITERATIONS = 100

s = pd.Series(np.arange(SIZE), name="old_name")
for _ in range(WARMUP): s.rename("new_name")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.rename("new_name")
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_rename", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
