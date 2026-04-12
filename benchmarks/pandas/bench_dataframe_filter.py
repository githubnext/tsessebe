"""Benchmark: DataFrame filter (boolean mask on 100k-row DataFrame)"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

vals = np.arange(ROWS, dtype=np.float64) * 0.1
df = pd.DataFrame({"value": vals})

for _ in range(WARMUP):
    df[df["value"] > 5000]

start = time.perf_counter()
for _ in range(ITERATIONS):
    df[df["value"] > 5000]
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_filter",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
