"""Benchmark: pandas Series property access — shape, ndim, size, empty, values, dtype, name"""
import json, time
import pandas as pd

N = 100_000
s = pd.Series(range(N), name="x", dtype=float)

WARMUP = 3
ITERATIONS = 100_000

for _ in range(WARMUP):
    _ = s.shape; _ = s.ndim; _ = s.size; _ = s.empty; _ = s.values; _ = s.dtype; _ = s.name

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = s.shape; _ = s.ndim; _ = s.size; _ = s.empty; _ = s.values; _ = s.dtype; _ = s.name
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "series_properties", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
