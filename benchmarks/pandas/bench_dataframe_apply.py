"""Benchmark: dataframe_apply — apply a function across rows of a 10k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

a = np.arange(ROWS, dtype=np.float64)
b = np.arange(ROWS, dtype=np.float64) * 2.0
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.apply(lambda row: row["a"] + row["b"], axis=1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.apply(lambda row: row["a"] + row["b"], axis=1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_apply",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
