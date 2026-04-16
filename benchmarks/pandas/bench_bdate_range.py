"""
Benchmark: pd.bdate_range — generate business-day DatetimeIndex with 1000 periods.
Outputs JSON: {"function": "bdate_range", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 100

for _ in range(WARMUP):
    pd.bdate_range(start="2020-01-01", periods=1000)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.bdate_range(start="2020-01-01", periods=1000)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "bdate_range",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
