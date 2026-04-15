"""Benchmark: index_fillna — Index.fillna replacing null values on 100k-element index"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [None if i % 10 == 0 else f"key_{i}" for i in range(ROWS)]
idx = pd.Index(data)

for _ in range(WARMUP):
    idx.fillna("missing")

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.fillna("missing")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "index_fillna",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
