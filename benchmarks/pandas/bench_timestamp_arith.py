"""Benchmark: Timestamp arithmetic — add timedelta, subtract, comparison operators."""
import json
import time
import pandas as pd
from datetime import timedelta

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

base = pd.Timestamp("2024-01-01")
timestamps = [pd.Timestamp("2020-01-01") + timedelta(days=i) for i in range(SIZE)]
delta = pd.Timedelta(days=30)
delta2 = pd.Timedelta(hours=12)

for _ in range(WARMUP):
    for ts in timestamps:
        ts + delta
        ts - delta2
        ts == base
        ts < base
        ts > base
        ts <= base
        ts >= base
        ts != base

start = time.perf_counter()
for _ in range(ITERATIONS):
    for ts in timestamps:
        ts + delta
        ts - delta2
        ts == base
        ts < base
        ts > base
        ts <= base
        ts >= base
        ts != base
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "timestamp_arith",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
