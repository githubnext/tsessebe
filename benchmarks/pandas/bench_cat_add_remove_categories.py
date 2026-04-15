"""Benchmark: cat_add_remove_categories — pandas CategoricalIndex add_categories/remove_categories on 100k-element Series"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

cats = ["a", "b", "c", "d"]
s = pd.Categorical([cats[i % len(cats)] for i in range(ROWS)], categories=cats)

for _ in range(WARMUP):
    _ = s.add_categories(["e", "f"])
    _ = s.remove_categories(["d"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = s.add_categories(["e", "f"])
    _ = s.remove_categories(["d"])
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "cat_add_remove_categories", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
