"""
Benchmark: pandas DatetimeIndex.snap(freq) — snap index to frequency boundaries (round to nearest).
Outputs JSON: {"function": "datetime_index_snap", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 5_000
WARMUP = 5
ITERATIONS = 50

# Dates that are not on month/week boundaries
idx = pd.date_range(start="2020-01-15", periods=SIZE, freq="D")

for _ in range(WARMUP):
    idx.snap("MS")  # snap to month start
    idx.snap("W")   # snap to week

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    idx.snap("MS")
    idx.snap("W")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "datetime_index_snap",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
