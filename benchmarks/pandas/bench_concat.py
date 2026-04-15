"""Benchmark: concat — concatenate two 50k-row DataFrames"""
import json, time
import numpy as np
import pandas as pd

ROWS = 50_000
WARMUP = 5
ITERATIONS = 20

vals1 = np.arange(ROWS, dtype=np.float64)
vals2 = np.arange(ROWS, dtype=np.float64) * 2.0
df1 = pd.DataFrame({"value": vals1})
df2 = pd.DataFrame({"value": vals2})

for _ in range(WARMUP):
    pd.concat([df1, df2], ignore_index=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.concat([df1, df2], ignore_index=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "concat",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
