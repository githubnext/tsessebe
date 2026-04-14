"""Benchmark: sort categories by frequency on 100k-element categorical Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
cats = ["rare", "common", "very_common", "ultra_common"]
data = []
for i in range(ROWS):
    r = i % 51
    data.append(cats[0] if r < 1 else cats[1] if r < 6 else cats[2] if r < 21 else cats[3])
s = pd.Series(data)

for _ in range(WARMUP):
    order = s.value_counts().index.tolist()
    s.astype(pd.CategoricalDtype(categories=order, ordered=True))

start = time.perf_counter()
for _ in range(ITERATIONS):
    order = s.value_counts().index.tolist()
    s.astype(pd.CategoricalDtype(categories=order, ordered=True))
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "cat_sort_by_freq", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
