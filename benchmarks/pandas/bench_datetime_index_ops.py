"""
Benchmark: pandas DatetimeIndex sort_values / unique / strftime / slice / isin / append — DatetimeIndex operations.
Outputs JSON: {"function": "datetime_index_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

idx = pd.date_range(start="2020-01-01", periods=SIZE, freq="h")
idx2 = pd.date_range(start="2021-01-01", periods=SIZE, freq="h")
ref_date = pd.Timestamp("2020-06-15T00:00:00Z")

for _ in range(WARMUP):
    idx.sort_values()
    idx.unique()
    idx.strftime("%Y-%m-%dT%H:%M:%SZ")
    idx[:100]
    ref_date in idx
    idx.append(idx2)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    idx.sort_values()
    idx.unique()
    idx.strftime("%Y-%m-%dT%H:%M:%SZ")
    idx[:100]
    ref_date in idx
    idx.append(idx2)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "datetime_index_ops",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
