"""Benchmark: str.removesuffix on 100k-element string Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [f"value_{i}_suffix" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.removesuffix("_suffix")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.removesuffix("_suffix")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_remove_suffix", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
