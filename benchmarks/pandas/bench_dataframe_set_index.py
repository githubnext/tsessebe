"""Benchmark: DataFrame.set_index(col) on 100k-row DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame({
    "id": np.arange(ROWS),
    "a": np.arange(ROWS) * 1.5,
    "b": np.arange(ROWS) * 2.5,
})
for _ in range(WARMUP): df.set_index("id")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.set_index("id")
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "dataframe_set_index", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
