"""
Benchmark: pandas DatetimeTZDtype index methods — tz_localize, sort_values, unique, filter, isin.
Outputs JSON: {"function": "tz_datetime_index_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

naive = pd.date_range(start="2024-01-01", periods=SIZE, freq="h")
tz_idx = naive.tz_localize("America/New_York")
ref_date = pd.Timestamp("2024-06-01", tz="America/New_York")

for _ in range(WARMUP):
    tz_idx.strftime("%Y-%m-%d %H:%M:%S %Z")
    tz_idx.sort_values()
    tz_idx.unique()
    tz_idx[tz_idx >= ref_date]
    ref_date in tz_idx

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    tz_idx.strftime("%Y-%m-%d %H:%M:%S %Z")
    tz_idx.sort_values()
    tz_idx.unique()
    tz_idx[tz_idx >= ref_date]
    ref_date in tz_idx
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "tz_datetime_index_ops", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
