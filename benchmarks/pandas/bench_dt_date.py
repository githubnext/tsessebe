"""Benchmark: dt_date — pandas dt.date on 100k datetime values"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = pd.date_range("2020-01-01", periods=ROWS, freq="D")
s = pd.Series(data)

for _ in range(WARMUP):
    _ = s.dt.date

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = s.dt.date
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "dt_date", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
