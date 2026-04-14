"""Benchmark: str.removeprefix on 100k-element string Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [f"prefix_value_{i}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.removeprefix("prefix_")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.removeprefix("prefix_")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_remove_prefix", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
