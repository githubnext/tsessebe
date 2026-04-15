"""Benchmark: dt_year_month_day — dt.year, dt.month, dt.day on 100k datetime values"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

dates = pd.date_range("2024-01-01", periods=ROWS, freq="1D")
s = pd.Series(dates)

for _ in range(WARMUP):
    s.dt.year
    s.dt.month
    s.dt.day

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.dt.year
    s.dt.month
    s.dt.day
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dt_year_month_day",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
