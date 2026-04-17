"""Benchmark: date_range — generate DatetimeIndex with various frequency options.
Mirrors tsb bench_date_range_options.ts using pandas.date_range.
"""
import json, time
import pandas as pd

WARMUP = 5
ITERATIONS = 100

for _ in range(WARMUP):
    pd.date_range(start="2020-01-01", periods=1_000, freq="D")
    pd.date_range(start="2020-01-01", periods=1_000, freq="h")
    pd.date_range(start="2020-01-01", periods=500, freq="ME")
    pd.date_range(start="2020-01-01", periods=200, freq="QE")
    pd.date_range(start="2020-01-01", periods=100, freq="YE")
    pd.date_range(start="2020-01-01", periods=500, freq="MS")
    pd.date_range(start="2020-01-01", end="2025-01-01", freq="W")
    pd.date_range(start="2020-01-01", periods=2_000, freq="min")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.date_range(start="2020-01-01", periods=1_000, freq="D")
    pd.date_range(start="2020-01-01", periods=1_000, freq="h")
    pd.date_range(start="2020-01-01", periods=500, freq="ME")
    pd.date_range(start="2020-01-01", periods=200, freq="QE")
    pd.date_range(start="2020-01-01", periods=100, freq="YE")
    pd.date_range(start="2020-01-01", periods=500, freq="MS")
    pd.date_range(start="2020-01-01", end="2025-01-01", freq="W")
    pd.date_range(start="2020-01-01", periods=2_000, freq="min")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "date_range_options",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
