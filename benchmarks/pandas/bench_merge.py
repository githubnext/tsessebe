"""Benchmark: merge — inner join two 50k-row DataFrames on a key column"""
import json, time
import numpy as np
import pandas as pd

ROWS = 50_000
WARMUP = 3
ITERATIONS = 10

keys = np.arange(ROWS) % 1000
vals1 = np.arange(ROWS, dtype=np.float64)
vals2 = np.arange(ROWS, dtype=np.float64) * 2.0
df1 = pd.DataFrame({"key": keys, "val1": vals1})
df2 = pd.DataFrame({"key": keys, "val2": vals2})

for _ in range(WARMUP):
    pd.merge(df1, df2, on="key", how="inner")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.merge(df1, df2, on="key", how="inner")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "merge",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
