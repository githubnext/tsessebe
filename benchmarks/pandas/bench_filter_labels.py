"""Benchmark: DataFrame.filter by items on 100k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "alpha": np.arange(ROWS, dtype=float),
    "beta": np.arange(ROWS, dtype=float) * 2,
    "gamma": np.arange(ROWS, dtype=float) * 3,
    "delta": np.arange(ROWS, dtype=float) * 4,
    "epsilon": np.arange(ROWS, dtype=float) * 5,
})

for _ in range(WARMUP):
    df.filter(items=["alpha", "gamma", "epsilon"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.filter(items=["alpha", "gamma", "epsilon"])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "filter_labels",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
