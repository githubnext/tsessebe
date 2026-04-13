"""Benchmark: value_counts on a 100k-element Series with 100 distinct values"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"cat_{i % 100}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.value_counts()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.value_counts()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_value_counts",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
