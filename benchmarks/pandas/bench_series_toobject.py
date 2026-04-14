"""Benchmark: Series.to_dict() — convert to dict on 100k Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 10

s = pd.Series(np.arange(SIZE) * 1.5)
for _ in range(WARMUP): s.to_dict()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.to_dict()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_toobject", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
