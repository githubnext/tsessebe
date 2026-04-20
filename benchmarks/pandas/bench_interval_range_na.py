"""
Benchmark: pd.interval_range — generate numeric IntervalIndex ranges.
Outputs JSON: {"function": "interval_range_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 100

for _ in range(WARMUP):
    pd.interval_range(start=0, end=1000, periods=100)
    pd.interval_range(start=0, periods=500, freq=2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.interval_range(start=0, end=1000, periods=100)
    pd.interval_range(start=0, periods=500, freq=2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "interval_range_na",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
