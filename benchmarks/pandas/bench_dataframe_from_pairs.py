"""Benchmark: pd.DataFrame construction from dict of arrays (100k rows)"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
a = list(range(ROWS))
b = [i * 2.5 for i in range(ROWS)]
c = [f"str_{i % 1000}" for i in range(ROWS)]

for _ in range(WARMUP):
    pd.DataFrame({"a": a, "b": b, "c": c})

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.DataFrame({"a": a, "b": b, "c": c})
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "dataframe_from_pairs", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
