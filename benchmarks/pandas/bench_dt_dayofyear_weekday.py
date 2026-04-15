"""Benchmark: dt_dayofyear_weekday — pandas dt.dayofyear, dt.weekday on 100k values"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = pd.date_range("2020-01-01", periods=ROWS, freq="D")
s = pd.Series(data)

for _ in range(WARMUP):
    _ = s.dt.dayofyear
    _ = s.dt.weekday

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = s.dt.dayofyear
    _ = s.dt.weekday
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "dt_dayofyear_weekday", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
