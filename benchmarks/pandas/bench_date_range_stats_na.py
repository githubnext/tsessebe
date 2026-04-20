"""
Benchmark: pd.date_range — generate date arrays with various frequencies.
Outputs JSON: {"function": "date_range_stats_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 100

start_ = "2020-01-01"
end_ = "2022-12-31"

for _ in range(WARMUP):
    pd.date_range(start=start_, end=end_, freq="D")
    pd.date_range(start=start_, periods=365, freq="D")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.date_range(start=start_, end=end_, freq="D")
    pd.date_range(start=start_, periods=365, freq="D")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "date_range_stats_na",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
