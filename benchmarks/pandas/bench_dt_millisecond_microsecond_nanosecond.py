"""Benchmark: dt_millisecond_microsecond_nanosecond — pandas dt.microsecond, dt.nanosecond on 100k values"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = pd.date_range("2020-01-01", periods=ROWS, freq="s")
s = pd.Series(data)

for _ in range(WARMUP):
    _ = s.dt.microsecond
    _ = s.dt.nanosecond

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = s.dt.microsecond
    _ = s.dt.nanosecond
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "dt_millisecond_microsecond_nanosecond", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
