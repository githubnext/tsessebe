"""
Benchmark: pandas.CategoricalIndex — creation, get_loc, add_categories, set operations on 100k elements.
Outputs JSON: {"function": "categorical_index", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

CATS = ["alpha", "beta", "gamma", "delta", "epsilon"]
labels = [CATS[i % len(CATS)] for i in range(SIZE)]
ci = pd.CategoricalIndex(labels)
labels2 = [CATS[(i + 2) % len(CATS)] for i in range(SIZE // 2)]
ci2 = pd.CategoricalIndex(labels2)

for _ in range(WARMUP):
    pd.CategoricalIndex(labels)
    ci.get_loc("beta")
    ci.add_categories(["zeta"])
    ci.union(ci2)
    ci.intersection(ci2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.CategoricalIndex(labels)
    ci.get_loc("beta")
    ci.add_categories(["zeta"])
    ci.union(ci2)
    ci.intersection(ci2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "categorical_index",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
