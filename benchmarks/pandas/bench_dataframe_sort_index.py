"""Benchmark: DataFrame.sort_index() on 100k-row DataFrame with shuffled index."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

idx = np.arange(ROWS - 1, -1, -1)
df = pd.DataFrame({"a": np.arange(ROWS) * 1.1, "b": np.arange(ROWS) * 2.2}, index=idx)
for _ in range(WARMUP): df.sort_index()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.sort_index()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "dataframe_sort_index", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
