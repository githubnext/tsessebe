"""Benchmark: describe — summary statistics on a 100k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

a = np.arange(ROWS, dtype=np.float64) * 1.1
b = np.sqrt(np.arange(1, ROWS + 1, dtype=np.float64))
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.describe()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.describe()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "describe",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
