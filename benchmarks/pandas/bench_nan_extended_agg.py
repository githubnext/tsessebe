"""
Benchmark: count/median/prod nan-ignoring aggregates on 100k-element array.
Outputs JSON: {"function": "nan_extended_agg", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

# Array with ~10% NaN values; small values to avoid prod overflow
data = np.where(
    np.arange(SIZE) % 10 == 0,
    np.nan,
    (np.arange(SIZE) % 100) * 0.01 + 1,
)
s = pd.Series(data)

for _ in range(WARMUP):
    s.count()
    s.median(skipna=True)
    s.prod(skipna=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.count()
    s.median(skipna=True)
    s.prod(skipna=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "nan_extended_agg",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
