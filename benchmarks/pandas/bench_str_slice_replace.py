"""Benchmark: str_slice_replace — pandas str.slice_replace() on 100k strings"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"hello_world_{i % 1000}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    _ = s.str.slice_replace(0, 5, "goodbye")

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = s.str.slice_replace(0, 5, "goodbye")
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "str_slice_replace", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
