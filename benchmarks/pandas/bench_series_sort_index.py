"""Benchmark: Series.sort_index() on 100k Series with string labels."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 10

labels = [f"lbl_{(SIZE - i):06d}" for i in range(SIZE)]
s = pd.Series(np.arange(SIZE), index=labels)
for _ in range(WARMUP): s.sort_index()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.sort_index()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_sort_index", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
