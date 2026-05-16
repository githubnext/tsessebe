"""Benchmark: pd.timedelta_range — evenly-spaced TimedeltaIndex factory."""
import json
import time
import pandas as pd

SIZE = 1_000
WARMUP = 5
ITERATIONS = 200

# Warm-up: three usage patterns
for _ in range(WARMUP):
    pd.timedelta_range(start="0 days", periods=SIZE, freq="h")
    pd.timedelta_range(start="0 days", end=f"{SIZE} days", freq="D")
    pd.timedelta_range(start="0 days", end="10 days", periods=SIZE)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.timedelta_range(start="0 days", periods=SIZE, freq="h")
    pd.timedelta_range(start="0 days", end=f"{SIZE} days", freq="D")
    pd.timedelta_range(start="0 days", end="10 days", periods=SIZE)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "timedelta_range",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
