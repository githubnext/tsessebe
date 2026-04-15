"""Benchmark: pandas DataFrame.insert (insert column) on 100k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

new_col = list(range(ROWS))
df_base = pd.DataFrame({"a": range(ROWS), "b": [i * 2 for i in range(ROWS)]})

for _ in range(WARMUP):
    df = df_base.copy()
    df.insert(1, "c", new_col)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df = df_base.copy()
    df.insert(1, "c", new_col)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "insert_column", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
