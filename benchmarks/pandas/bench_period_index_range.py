"""Benchmark: pd.period_range / pd.PeriodIndex — PeriodIndex construction."""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 50

start_d = pd.Period("2000-01-01", freq="D")
start_m = pd.Period("2000-01", freq="M")
day_periods = pd.period_range(start="2000-01-01", periods=365 * 10, freq="D")

for _ in range(WARMUP):
    pd.period_range(start=start_d, periods=3650, freq="D")
    pd.period_range(start=start_m, periods=120, freq="ME")
    pd.PeriodIndex(day_periods[:365])

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.period_range(start=start_d, periods=3650, freq="D")
    pd.period_range(start=start_m, periods=120, freq="ME")
    pd.PeriodIndex(day_periods[:365])
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "period_index_range", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
