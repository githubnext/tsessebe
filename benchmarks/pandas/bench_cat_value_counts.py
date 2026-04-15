"""Benchmark: cat_value_counts — pandas Categorical value_counts on 100k-element Series"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

cats = ["a", "b", "c", "d", "e"]
s = pd.Categorical([cats[i % len(cats)] for i in range(ROWS)], categories=cats)

for _ in range(WARMUP):
    _ = pd.Series(s).value_counts()

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = pd.Series(s).value_counts()
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "cat_value_counts", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
