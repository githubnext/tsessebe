"""Benchmark: Series.apply on 100k-element pandas Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
s = pd.Series([i * 0.1 for i in range(ROWS)])

for _ in range(WARMUP):
    s.apply(lambda v: v * 2 + 1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.apply(lambda v: v * 2 + 1)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "series_apply", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
