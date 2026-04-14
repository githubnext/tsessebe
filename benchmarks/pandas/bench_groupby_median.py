"""Benchmark: DataFrame.groupby().median() on 100k-row DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "group": np.arange(ROWS) % 100,
    "value": (np.arange(ROWS) * 1.414) % 9999,
})
for _ in range(WARMUP): df.groupby("group")["value"].median()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.groupby("group")["value"].median()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "groupby_median", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
