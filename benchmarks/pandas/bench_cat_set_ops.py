"""Benchmark: categorical set operations (union, intersect, diff)"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
cats1 = [f"cat_{i}" for i in range(500)]
cats2 = [f"cat_{i+250}" for i in range(500)]
c1 = pd.CategoricalDtype(categories=cats1)
c2 = pd.CategoricalDtype(categories=cats2)

for _ in range(WARMUP):
    set(c1.categories) | set(c2.categories)
    set(c1.categories) & set(c2.categories)
    set(c1.categories) - set(c2.categories)

start = time.perf_counter()
for _ in range(ITERATIONS):
    set(c1.categories) | set(c2.categories)
    set(c1.categories) & set(c2.categories)
    set(c1.categories) - set(c2.categories)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "cat_set_ops", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
