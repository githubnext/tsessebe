"""
Benchmark: pandas.to_timedelta() — convert scalars/arrays to Timedelta objects.
Outputs JSON: {"function": "to_timedelta_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

num_arr = np.arange(SIZE) * 1_000_000
s = pd.Series(num_arr)

for _ in range(WARMUP):
    pd.to_timedelta(3600, unit="s")
    pd.to_timedelta(num_arr, unit="ms")
    pd.to_timedelta(s, unit="ms")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.to_timedelta(3600, unit="s")
    pd.to_timedelta(num_arr, unit="ms")
    pd.to_timedelta(s, unit="ms")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "to_timedelta_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
