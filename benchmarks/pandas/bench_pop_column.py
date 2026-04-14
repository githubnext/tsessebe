"""Benchmark: DataFrame.drop column on a 100k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
df_base = pd.DataFrame({"a": range(ROWS), "b": [i*2 for i in range(ROWS)], "c": [i*3 for i in range(ROWS)]})

for _ in range(WARMUP):
    df_base.drop(columns=["b"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    df_base.drop(columns=["b"])
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "pop_column", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
