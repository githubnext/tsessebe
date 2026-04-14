"""Benchmark: DataFrame.isna() on 100k-row DataFrame with some NAs."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 30

a = np.where(np.arange(ROWS) % 5 == 0, np.nan, np.arange(ROWS, dtype=float))
b = np.where(np.arange(ROWS) % 7 == 0, np.nan, np.arange(ROWS, dtype=float) * 2)
df = pd.DataFrame({"a": a, "b": b})
for _ in range(WARMUP): df.isna()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.isna()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "dataframe_isna", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
