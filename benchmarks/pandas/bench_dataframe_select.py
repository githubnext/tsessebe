"""Benchmark: DataFrame[[cols]] column selection on 100k-row DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": np.arange(ROWS) * 1.0, "b": np.arange(ROWS) * 2.0,
    "c": np.arange(ROWS) * 3.0, "d": np.arange(ROWS) * 4.0,
})
for _ in range(WARMUP): df[["a", "c"]]

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df[["a", "c"]]
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "dataframe_select", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
