"""Benchmark: pd.DatetimeIndex from dates/timestamps — DatetimeIndex construction from raw data."""
import json
import time
import numpy as np
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

base = pd.Timestamp("2000-01-01")
dates = [base + pd.Timedelta(days=i) for i in range(SIZE)]
timestamps = np.arange(SIZE) * 86_400 * 1_000_000_000 + base.value  # nanosecond timestamps

for _ in range(WARMUP):
    pd.DatetimeIndex(dates)
    pd.DatetimeIndex(timestamps)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.DatetimeIndex(dates)
    pd.DatetimeIndex(timestamps)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "datetime_index_from", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
