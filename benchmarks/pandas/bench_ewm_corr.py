"""Benchmark: Series.ewm(span=10).corr(other) on 100k-element Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 10

idx = np.arange(SIZE)
a = pd.Series(np.sin(idx * 0.01))
b = pd.Series(np.cos(idx * 0.01))
for _ in range(WARMUP): a.ewm(span=10).corr(b)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    a.ewm(span=10).corr(b)
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "ewm_corr", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
