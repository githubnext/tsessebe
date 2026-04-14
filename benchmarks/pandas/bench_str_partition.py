"""Benchmark: str.partition on 100k-element string Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [f"prefix_{i}_suffix" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.partition("_")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.partition("_")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_partition", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
