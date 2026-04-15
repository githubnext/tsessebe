"""Benchmark: Categorical from codes on 100k-element array"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

categories = ["apple", "banana", "cherry", "date", "elderberry"]
codes = np.arange(ROWS) % len(categories)

for _ in range(WARMUP):
    pd.Categorical.from_codes(codes, categories=categories)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.Categorical.from_codes(codes, categories=categories)
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "cat_from_codes", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
