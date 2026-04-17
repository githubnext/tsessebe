"""
Benchmark: pandas DatetimeIndex.normalize() / date filtering / shift — DatetimeIndex transforms.
Outputs JSON: {"function": "datetime_index_normalize_filter_shift", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 5_000
WARMUP = 5
ITERATIONS = 50

idx = pd.date_range(start="2020-01-01 12:30:00", periods=SIZE, freq="h")
cutoff = pd.Timestamp("2021-01-01")

for _ in range(WARMUP):
    idx.normalize()
    idx[idx < cutoff]
    idx.shift(7, freq="D")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    idx.normalize()
    idx[idx < cutoff]
    idx.shift(7, freq="D")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "datetime_index_normalize_filter_shift",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
