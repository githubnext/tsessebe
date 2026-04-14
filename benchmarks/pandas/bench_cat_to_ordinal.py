"""Benchmark: catToOrdinal on 100k-element categorical Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
cats = ["low", "med", "high"]
data = [cats[i % 3] for i in range(ROWS)]
s = pd.Series(pd.Categorical(data))

for _ in range(WARMUP):
    s.astype(pd.CategoricalDtype(categories=cats, ordered=True))

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.astype(pd.CategoricalDtype(categories=cats, ordered=True))
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "cat_to_ordinal", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
