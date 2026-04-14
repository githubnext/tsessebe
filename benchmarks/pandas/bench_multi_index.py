"""Benchmark: MultiIndex construction on 100k pairs"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
a = [f"a{i % 100}" for i in range(ROWS)]
b = [i % 1000 for i in range(ROWS)]
tuples = list(zip(a, b))

for _ in range(WARMUP):
    pd.MultiIndex.from_tuples(tuples)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.MultiIndex.from_tuples(tuples)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "multi_index", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
