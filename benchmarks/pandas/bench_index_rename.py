"""Benchmark: index_rename — Index.rename changing the index name"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"key_{i}" for i in range(ROWS)]
idx = pd.Index(data, name="original_name")

for _ in range(WARMUP):
    idx.rename("new_name")

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.rename("new_name")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_rename",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
