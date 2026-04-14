"""Benchmark: Series.to_string on 1k-element pandas Series"""
import json, time
import pandas as pd

N = 1_000
WARMUP = 3
ITERATIONS = 10
s = pd.Series([i * 0.1 for i in range(N)])

for _ in range(WARMUP):
    s.to_string()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.to_string()
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "series_to_string", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
