"""
Benchmark: pandas.factorize / Series.factorize with sort=True and use_na_sentinel options.
Outputs JSON: {"function": "factorize_sort", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

categories = ["zebra", "apple", "mango", "banana", "coconut", "date"]
data = [None if i % 15 == 0 else categories[i % len(categories)] for i in range(SIZE)]
s = pd.Series(data, dtype="object")

for _ in range(WARMUP):
    pd.factorize(data, sort=True)
    pd.factorize(data, sort=True, use_na_sentinel=True)
    s.factorize(sort=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.factorize(data, sort=True)
    pd.factorize(data, sort=True, use_na_sentinel=True)
    s.factorize(sort=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "factorize_sort", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
