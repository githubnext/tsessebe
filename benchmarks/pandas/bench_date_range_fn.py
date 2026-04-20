"""
Benchmark: pandas.date_range() — generate a fixed-frequency date sequence.
Outputs JSON: {"function": "date_range_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 100

start = "2020-01-01"
end = "2022-12-31"

for _ in range(WARMUP):
    pd.date_range(start=start, end=end, freq="D")
    pd.date_range(start=start, periods=365, freq="D")
    pd.date_range(start=start, periods=24, freq="h")

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    pd.date_range(start=start, end=end, freq="D")
    pd.date_range(start=start, periods=365, freq="D")
    pd.date_range(start=start, periods=24, freq="h")
total = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "date_range_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
