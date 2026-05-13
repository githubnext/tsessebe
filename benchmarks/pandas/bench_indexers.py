"""Benchmark: FixedForwardWindowIndexer and VariableOffsetWindowIndexer on 100k rows"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

offsets = np.array([3 + (i % 5) for i in range(ROWS)], dtype=np.int32)

fixed_idx = pd.api.indexers.FixedForwardWindowIndexer(window_size=10)
var_idx = pd.api.indexers.VariableOffsetWindowIndexer(index=pd.date_range("2020", periods=ROWS, freq="D"), offset=pd.offsets.Day(3))

# Warm up with just fixed (VariableOffsetWindowIndexer needs DatetimeIndex in pandas)
for _ in range(WARMUP):
    fixed_idx.get_window_bounds(ROWS, min_periods=1, center=False, closed=None)

start = time.perf_counter()
for _ in range(ITERATIONS):
    fixed_idx.get_window_bounds(ROWS, min_periods=1, center=False, closed=None)
    var_idx.get_window_bounds(ROWS, min_periods=1, center=False, closed=None)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "indexers",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
