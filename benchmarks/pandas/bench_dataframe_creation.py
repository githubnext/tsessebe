"""Benchmark: DataFrame creation from arrays (pandas equivalent)"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

nums1 = np.arange(ROWS, dtype=np.float64) * 1.1
nums2 = np.arange(ROWS, dtype=np.float64) * 2.2
strs = [f"label_{i % 100}" for i in range(ROWS)]

for _ in range(WARMUP):
    pd.DataFrame({"a": nums1, "b": nums2, "c": strs})

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.DataFrame({"a": nums1, "b": nums2, "c": strs})
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_creation",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
