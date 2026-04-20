"""
Benchmark: pandas.interval_range() — generate equal-length intervals.
Outputs JSON: {"function": "interval_range_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 100

for _ in range(WARMUP):
    pd.interval_range(start=0, end=100, periods=1000)
    pd.interval_range(start=0, end=1, freq=0.001)
    pd.interval_range(start=0, end=50, periods=500, closed="left")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.interval_range(start=0, end=100, periods=1000)
    pd.interval_range(start=0, end=1, freq=0.001)
    pd.interval_range(start=0, end=50, periods=500, closed="left")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "interval_range_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
