"""
Benchmark: pandas Series.where() / Series.mask() — conditional replacement.
Outputs JSON: {"function": "where_mask_series_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series([i * 0.1 for i in range(SIZE)])
cond = s > SIZE * 0.05
cond_arr = pd.Series([i > SIZE * 0.5 for i in range(SIZE)])

for _ in range(WARMUP):
    s.where(cond, 0)
    s.mask(cond_arr, -1)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.where(cond, 0)
    s.mask(cond_arr, -1)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "where_mask_series_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
