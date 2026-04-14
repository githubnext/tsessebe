"""Benchmark: DataFrame row-wise transform on 10k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
df = pd.DataFrame({"a": [i * 1.0 for i in range(ROWS)], "b": [i * 2.0 for i in range(ROWS)]})

for _ in range(WARMUP):
    df.apply(lambda row: pd.Series({"a": row["a"] * 2, "b": row["b"] + 1}), axis=1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.apply(lambda row: pd.Series({"a": row["a"] * 2, "b": row["b"] + 1}), axis=1)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "dataframe_transform_rows", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
