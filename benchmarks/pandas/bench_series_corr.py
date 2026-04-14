"""Benchmark: Series.corr(other) Pearson correlation on 100k-element Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

rng = np.random.default_rng(42)
a = pd.Series(np.arange(SIZE) * 0.1)
b = pd.Series(np.arange(SIZE) * 0.2 + rng.random(SIZE))

for _ in range(WARMUP): a.corr(b)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    a.corr(b)
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_corr", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
