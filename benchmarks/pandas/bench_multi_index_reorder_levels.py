"""Benchmark: MultiIndex.reorder_levels() on 100k-pair MultiIndex"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
a = [f"a{i % 100}" for i in range(ROWS)]
b = [i % 1000 for i in range(ROWS)]
c = [i % 50 for i in range(ROWS)]
tuples = list(zip(a, b, c))
mi = pd.MultiIndex.from_tuples(tuples)

for _ in range(WARMUP):
    mi.reorder_levels([2, 0, 1])

start = time.perf_counter()
for _ in range(ITERATIONS):
    mi.reorder_levels([2, 0, 1])
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "multi_index_reorder_levels", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
