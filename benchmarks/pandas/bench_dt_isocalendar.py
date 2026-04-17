"""
Benchmark: pandas DatetimeIndex.isocalendar().week on 100k dates.
Outputs JSON: {"function": "dt_isocalendar", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

dates = pd.date_range("2000-01-01", periods=ROWS, freq="D")
s = pd.Series(dates)

for _ in range(WARMUP):
    s.dt.isocalendar()["week"]

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.dt.isocalendar()["week"]
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "dt_isocalendar", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
