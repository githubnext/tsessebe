"""Benchmark: DataFrame.assign — add computed columns to a 100k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "a": np.arange(ROWS, dtype=float),
    "b": np.arange(ROWS, dtype=float) * 2,
})

for _ in range(WARMUP):
    df.assign(c=lambda d: d["a"] + d["b"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.assign(c=lambda d: d["a"] + d["b"])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "assign",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
