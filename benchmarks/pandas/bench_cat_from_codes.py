"""Benchmark: pd.Categorical.from_codes on 100k-element code array"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
categories = ["alpha", "beta", "gamma", "delta"]
codes = [i % 4 for i in range(ROWS)]

for _ in range(WARMUP):
    pd.Categorical.from_codes(codes, categories=categories)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.Categorical.from_codes(codes, categories=categories)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "cat_from_codes", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
