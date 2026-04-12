"""Benchmark: dataframe_dropna — drop rows with NaN values from 100k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

a = np.where(np.arange(ROWS) % 10 == 0, np.nan, np.arange(ROWS) * 1.1)
b = np.where(np.arange(ROWS) % 7 == 0, np.nan, np.arange(ROWS) * 2.2)
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.dropna()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.dropna()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_dropna",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
