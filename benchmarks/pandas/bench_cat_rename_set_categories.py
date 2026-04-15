"""Benchmark: cat_rename_set_categories — pandas Categorical rename_categories/set_categories on 100k-element Series"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

cats = ["a", "b", "c", "d"]
s = pd.Categorical([cats[i % len(cats)] for i in range(ROWS)], categories=cats)

for _ in range(WARMUP):
    _ = s.rename_categories({"a": "alpha", "b": "beta"})
    _ = s.set_categories(["a", "b", "c", "d", "e"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = s.rename_categories({"a": "alpha", "b": "beta"})
    _ = s.set_categories(["a", "b", "c", "d", "e"])
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "cat_rename_set_categories", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
