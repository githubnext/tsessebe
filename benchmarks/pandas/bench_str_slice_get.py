"""Benchmark: str_slice_get — str.slice and str.get character extraction on 100k strings"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"hello_world_{i}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str[0:5]
    s.str.get(0)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str[0:5]
    s.str.get(0)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_slice_get",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
