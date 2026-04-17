"""Benchmark: Series.dt.total_seconds() — epoch-second conversion on 100k datetime Series."""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

base = pd.Timestamp("2020-01-01T00:00:00Z")
dates = pd.date_range(start=base, periods=SIZE, freq="min")
s = pd.Series(dates)

for _ in range(WARMUP):
    (s - pd.Timestamp("1970-01-01", tz="UTC")).dt.total_seconds()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    (s - pd.Timestamp("1970-01-01", tz="UTC")).dt.total_seconds()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "dt_total_seconds", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
