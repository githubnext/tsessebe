"""Benchmark: pd.tseries.frequencies.to_offset — frequency string-to-offset resolution."""
import json
import time
import pandas as pd
from pandas.tseries.frequencies import to_offset

WARMUP = 5
ITERATIONS = 1_000

freqs = ["D", "h", "min", "s", "ms", "ME", "QE", "YE", "W", "B"]

for _ in range(WARMUP):
    for f in freqs:
        to_offset(f)
        to_offset(f"2{f}")

start = time.perf_counter()
for _ in range(ITERATIONS):
    for f in freqs:
        to_offset(f)
        to_offset(f"2{f}")
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "resolve_freq", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
