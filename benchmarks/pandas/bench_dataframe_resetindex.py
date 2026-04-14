"""Benchmark: DataFrame.reset_index() on 100k-row DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 30

idx = np.arange(ROWS - 1, -1, -1)
df = pd.DataFrame({"a": np.arange(ROWS) * 1.0, "b": np.arange(ROWS) * 2.0}, index=idx)
for _ in range(WARMUP): df.reset_index(drop=True)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.reset_index(drop=True)
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "dataframe_resetindex", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
