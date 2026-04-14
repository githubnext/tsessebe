"""Benchmark: pd.concat([df1, df2], axis=1) — column-wise concat on 100k-row DataFrames."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

df1 = pd.DataFrame({"a": np.arange(ROWS) * 1.0, "b": np.arange(ROWS) * 2.0})
df2 = pd.DataFrame({"c": np.arange(ROWS) * 3.0, "d": np.arange(ROWS) * 4.0})

for _ in range(WARMUP): pd.concat([df1, df2], axis=1)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.concat([df1, df2], axis=1)
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "concat_axis1", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
