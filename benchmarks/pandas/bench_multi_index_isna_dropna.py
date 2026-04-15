"""Benchmark: MultiIndex.isna(), notna(), dropna() on 100k-pair MultiIndex with some nulls"""
import json, time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

# Create a MultiIndex with some null values
a = [None if i % 10 == 0 else f"a{i % 100}" for i in range(ROWS)]
b = [None if i % 20 == 0 else i % 1000 for i in range(ROWS)]
tuples = list(zip(a, b))

mi = pd.MultiIndex.from_tuples(tuples)

for _ in range(WARMUP):
    mi.isna()
    mi.notna()
    mi.dropna()

start = time.perf_counter()
for _ in range(ITERATIONS):
    mi.isna()
    mi.notna()
    mi.dropna()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "multi_index_isna_dropna",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
