"""Benchmark: index_append — Index.append concatenating two indices"""
import json
import time
import pandas as pd

ROWS = 50_000
WARMUP = 3
ITERATIONS = 10

data1 = [f"key_{i}" for i in range(ROWS)]
data2 = [f"key_{ROWS + i}" for i in range(ROWS)]
idx1 = pd.Index(data1)
idx2 = pd.Index(data2)

for _ in range(WARMUP):
    idx1.append(idx2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx1.append(idx2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_append",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
