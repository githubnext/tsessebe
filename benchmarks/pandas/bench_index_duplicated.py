"""Benchmark: index_duplicated — pandas Index.duplicated() on 100k-element Index with duplicates"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

idx = pd.Index([i % 90_000 for i in range(ROWS)])

for _ in range(WARMUP):
    _ = idx.duplicated(keep="first")

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = idx.duplicated(keep="first")
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "index_duplicated", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
