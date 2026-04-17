"""
Benchmark: pandas IntervalIndex.from_arrays() and IntervalIndex.from_tuples() — alternative constructors.
Outputs JSON: {"function": "interval_index_construction", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

# Prepare data
left_arr = np.arange(SIZE) * 0.1
right_arr = left_arr + 0.1

# Prepare tuples for from_tuples
tuples = [(left_arr[i], right_arr[i]) for i in range(SIZE)]

for _ in range(WARMUP):
    pd.IntervalIndex.from_arrays(left_arr, right_arr)
    pd.IntervalIndex.from_arrays(left_arr, right_arr, closed="left")
    pd.IntervalIndex.from_tuples(tuples)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.IntervalIndex.from_arrays(left_arr, right_arr)
    pd.IntervalIndex.from_arrays(left_arr, right_arr, closed="left")
    pd.IntervalIndex.from_tuples(tuples)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "interval_index_construction",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
