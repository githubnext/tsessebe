"""Benchmark: tz-aware DatetimeIndex — slice, concat, min/max, tz_convert,
tz_localize(None), and array conversions on 10k-element index."""
import pandas as pd
import numpy as np
import json
import time

SIZE = 10_000
WARMUP = 3
ITERATIONS = 20

naive = pd.date_range("2024-01-01", periods=SIZE, freq="h")
tz_idx = naive.tz_localize("America/New_York")
half = SIZE // 2

for _ in range(WARMUP):
    tz_idx[:half]
    tz_idx[:half].append(tz_idx[half:])
    tz_idx[0]
    tz_idx.to_list()
    tz_idx.asi8
    tz_idx.min()
    tz_idx.max()
    tz_idx.tz_convert("UTC")
    tz_idx.tz_localize(None)

start = time.perf_counter()
for _ in range(ITERATIONS):
    tz_idx[:half]
    tz_idx[:half].append(tz_idx[half:])
    tz_idx[0]
    tz_idx.to_list()
    tz_idx.asi8
    tz_idx.min()
    tz_idx.max()
    tz_idx.tz_convert("UTC")
    tz_idx.tz_localize(None)
total = time.perf_counter() - start

print(json.dumps({
    "function": "tz_datetime_index_extra",
    "mean_ms": total / ITERATIONS * 1000,
    "iterations": ITERATIONS,
    "total_ms": total * 1000,
}))
