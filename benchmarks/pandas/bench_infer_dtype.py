"""
Benchmark: infer_dtype — pandas.api.types.infer_dtype on 100k-element arrays.
Outputs JSON: {"function": "infer_dtype", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd
from pandas.api.types import infer_dtype

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

int_arr = list(range(SIZE))
float_arr = [i * 0.5 for i in range(SIZE)]
str_arr = [f"val_{i}" for i in range(SIZE)]
mixed_arr = [f"s{i}" if i % 3 == 0 else i for i in range(SIZE)]

for _ in range(WARMUP):
    infer_dtype(int_arr, skipna=True)
    infer_dtype(float_arr, skipna=True)
    infer_dtype(str_arr, skipna=True)
    infer_dtype(mixed_arr, skipna=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    infer_dtype(int_arr, skipna=True)
    infer_dtype(float_arr, skipna=True)
    infer_dtype(str_arr, skipna=True)
    infer_dtype(mixed_arr, skipna=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "infer_dtype",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
