"""Benchmark: Timestamp string formatting — strftime, isoformat, day_name, month_name."""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

timestamps = [
    pd.Timestamp(year=2020, month=(i % 12) + 1, day=(i % 28) + 1,
                 hour=i % 24, minute=i % 60, second=i % 60)
    for i in range(SIZE)
]

for _ in range(WARMUP):
    for ts in timestamps:
        ts.strftime("%Y-%m-%d %H:%M:%S")
        ts.isoformat()
        ts.day_name()
        ts.month_name()

start = time.perf_counter()
for _ in range(ITERATIONS):
    for ts in timestamps:
        ts.strftime("%Y-%m-%d %H:%M:%S")
        ts.isoformat()
        ts.day_name()
        ts.month_name()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "timestamp_str_format",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
