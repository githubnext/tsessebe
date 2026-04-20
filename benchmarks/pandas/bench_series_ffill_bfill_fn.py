"""
Benchmark: pandas Series.ffill() / Series.bfill() — forward/backward fill.
Outputs JSON: {"function": "series_ffill_bfill_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series([float("nan") if i % 5 == 0 else i * 1.0 for i in range(SIZE)])

for _ in range(WARMUP):
    s.ffill()
    s.bfill()
    s.ffill(limit=2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.ffill()
    s.bfill()
    s.ffill(limit=2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_ffill_bfill_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
