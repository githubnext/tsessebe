"""Benchmark: pandas dtype access — dtype property, kind, itemsize, numeric checks"""
import json, time
import pandas as pd
import numpy as np

WARMUP = 3
ITERATIONS = 10_000

values = list(range(100))
arr = np.array(values, dtype=np.float64)

for _ in range(WARMUP):
    dt = arr.dtype
    _ = dt.kind
    _ = dt.itemsize
    _ = np.dtype("float64")
    _ = np.result_type(np.dtype("float32"), np.dtype("float64"))
    _ = pd.api.types.is_numeric_dtype(dt)
    _ = pd.api.types.is_float_dtype(dt)
    _ = pd.api.types.is_integer_dtype(dt)

start = time.perf_counter()
for _ in range(ITERATIONS):
    dt = arr.dtype
    _ = dt.kind
    _ = dt.itemsize
    _ = np.dtype("float64")
    _ = np.result_type(np.dtype("float32"), np.dtype("float64"))
    _ = pd.api.types.is_numeric_dtype(dt)
    _ = pd.api.types.is_float_dtype(dt)
    _ = pd.api.types.is_integer_dtype(dt)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "dtype", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
