"""Benchmark: DataFrame.groupby(by).std() on 100k-row DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "group": np.arange(ROWS) % 50,
    "a": (np.arange(ROWS) * 1.23) % 9999,
    "b": (np.arange(ROWS) * 4.56) % 9999,
})
for _ in range(WARMUP): df.groupby("group").std()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.groupby("group").std()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "groupby_std_df", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
