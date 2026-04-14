"""Benchmark: str.split(expand=True) on 10k-element string Series"""
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
data = [f"a_{i}_b_{i*2}_c" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.split("_", expand=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.split("_", expand=True)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_split_expand", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
