"""Benchmark: merge with sort=True — sort result by join-key on 50k-row DataFrames."""
import json
import time
import numpy as np
import pandas as pd

ROWS = 50_000
WARMUP = 3
ITERATIONS = 20

left = pd.DataFrame({
    "id": np.arange(ROWS) % (ROWS // 2),
    "val_l": np.arange(ROWS) * 1.5,
})

right = pd.DataFrame({
    "id": np.arange(ROWS // 2),
    "val_r": np.arange(ROWS // 2) * 2.0,
})

for _ in range(WARMUP):
    pd.merge(left, right, on="id", how="inner", sort=True)

times = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    pd.merge(left, right, on="id", how="inner", sort=True)
    times.append((time.perf_counter() - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({"function": "merge_sort", "mean_ms": mean_ms, "iterations": ITERATIONS, "total_ms": total_ms}))
