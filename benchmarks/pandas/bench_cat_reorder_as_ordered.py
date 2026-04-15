"""Benchmark: cat_reorder_as_ordered — pandas Categorical reorder_categories/as_ordered/as_unordered on 100k-element Series"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

cats = ["a", "b", "c", "d"]
s = pd.Categorical([cats[i % len(cats)] for i in range(ROWS)], categories=cats)

for _ in range(WARMUP):
    _ = s.reorder_categories(["d", "c", "b", "a"])
    _ = s.as_ordered()
    _ = s.as_unordered()

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = s.reorder_categories(["d", "c", "b", "a"])
    _ = s.as_ordered()
    _ = s.as_unordered()
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "cat_reorder_as_ordered", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
