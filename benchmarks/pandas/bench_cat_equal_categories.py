"""Benchmark: compare categorical categories equality (10k iterations)"""
import json, time
import pandas as pd

WARMUP = 3
ITERATIONS = 10
cats1 = ["cat_0", "cat_1", "cat_2"]
cats2 = ["cat_0", "cat_1", "cat_2"]
c1 = pd.CategoricalDtype(categories=cats1)
c2 = pd.CategoricalDtype(categories=cats2)
REPS = 10_000

for _ in range(WARMUP):
    for _ in range(REPS):
        set(c1.categories) == set(c2.categories)

start = time.perf_counter()
for _ in range(ITERATIONS):
    for _ in range(REPS):
        set(c1.categories) == set(c2.categories)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "cat_equal_categories", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
