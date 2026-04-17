"""
Benchmark: np.count_nonzero / np.nanprod / np.nanmedian — extended nan-ignoring aggregates.
Outputs JSON: {"function": "nan_agg_extended", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import time
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

# Array with ~15% NaN values
data = np.array([float("nan") if i % 7 == 0 else math.cos(i * 0.02) * 50 + 1 for i in range(SIZE)])

for _ in range(WARMUP):
    np.sum(~np.isnan(data))
    np.nanprod(data[:1000])
    np.nanmedian(data)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.sum(~np.isnan(data))
    np.nanprod(data[:1000])
    np.nanmedian(data)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "nan_agg_extended", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
