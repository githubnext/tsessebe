"""
Benchmark: DatetimeIndex.tz_localize / tz_convert — timezone operations on 10k-element index.
Outputs JSON: {"function": "tz_localize_convert", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

naive = pd.date_range(start="2024-01-01", periods=SIZE, freq="h")

for _ in range(WARMUP):
    utc = naive.tz_localize("UTC")
    utc.tz_convert("America/New_York")
    naive.tz_localize("America/New_York", ambiguous="NaT", nonexistent="NaT")

start = time.perf_counter()
for _ in range(ITERATIONS):
    utc = naive.tz_localize("UTC")
    utc.tz_convert("America/New_York")
    naive.tz_localize("America/New_York", ambiguous="NaT", nonexistent="NaT")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "tz_localize_convert",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
