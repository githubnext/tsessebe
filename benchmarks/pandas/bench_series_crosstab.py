"""
Benchmark: pd.crosstab — cross-tabulation of two categorical Series.
Outputs JSON: {"function": "series_crosstab", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 20

categories_a = ["apple", "banana", "cherry", "date", "elderberry"]
categories_b = ["north", "south", "east", "west"]

a = pd.Series([categories_a[i % len(categories_a)] for i in range(SIZE)], name="product")
b = pd.Series([categories_b[i % len(categories_b)] for i in range(SIZE)], name="region")

for _ in range(WARMUP):
    pd.crosstab(a, b)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.crosstab(a, b)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_crosstab",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
