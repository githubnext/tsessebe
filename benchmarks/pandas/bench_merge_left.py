"""Benchmark: pd.merge(left, right, how='left') on 50k-row DataFrames."""
import json, time
import numpy as np
import pandas as pd

ROWS = 50_000
WARMUP = 3
ITERATIONS = 10

left = pd.DataFrame({"id": np.arange(ROWS), "val": np.arange(ROWS) * 1.5})
right = pd.DataFrame({"id": np.arange(ROWS) % (ROWS // 2), "extra": np.arange(ROWS) * 2.0})

for _ in range(WARMUP): pd.merge(left, right, on="id", how="left")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.merge(left, right, on="id", how="left")
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "merge_left", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
