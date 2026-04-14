"""Benchmark: reorder DataFrame columns on a 100k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
df = pd.DataFrame({"a": range(ROWS), "b": [i*2 for i in range(ROWS)], "c": [i*3 for i in range(ROWS)]})

for _ in range(WARMUP):
    df[["c", "a", "b"]]

start = time.perf_counter()
for _ in range(ITERATIONS):
    df[["c", "a", "b"]]
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "reorder_columns", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
