"""Benchmark: DataFrame.min() and DataFrame.max() on 100k-row DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": (np.arange(ROWS) * 3.14) % 5000,
    "b": (np.arange(ROWS) * 2.71) % 8000,
    "c": np.arange(ROWS, dtype=float),
})
for _ in range(WARMUP): df.min(); df.max()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.min()
    df.max()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "dataframe_min_max", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
