"""Benchmark: Series.reset_index() on 100k Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

labels = [f"key_{i}" for i in range(SIZE)]
s = pd.Series(np.arange(SIZE), index=labels)
for _ in range(WARMUP): s.reset_index(drop=True)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.reset_index(drop=True)
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_resetindex", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
