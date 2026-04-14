"""Benchmark: catRecode on 100k-element categorical Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
cats = ["a", "b", "c"]
data = [cats[i % 3] for i in range(ROWS)]
s = pd.Series(pd.Categorical(data))
rmap = {"a": "x", "b": "y", "c": "z"}

for _ in range(WARMUP):
    s.cat.rename_categories(rmap)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.cat.rename_categories(rmap)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "cat_recode", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
