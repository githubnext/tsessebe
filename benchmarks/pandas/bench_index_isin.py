"""Benchmark: index_isin — pandas Index.isin() membership check on 100k-element Index"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

idx = pd.Index(range(ROWS))
lookup = list(range(0, ROWS, 100))

for _ in range(WARMUP):
    _ = idx.isin(lookup)

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = idx.isin(lookup)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "index_isin", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
