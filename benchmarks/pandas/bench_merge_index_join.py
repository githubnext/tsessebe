"""Benchmark: merge with left_index / right_index options on 10k-row DataFrames."""
import json, time
import pandas as pd
import numpy as np

SIZE = 10_000
WARMUP = 5
ITERATIONS = 30

left = pd.DataFrame({"val_a": np.arange(SIZE) * 1.5})
right = pd.DataFrame({"val_b": np.arange(SIZE) * 2.0})

for _ in range(WARMUP):
    pd.merge(left, right, left_index=True, right_index=True, how="inner")
    pd.merge(left, right, left_index=True, right_index=True, how="outer")
    pd.merge(left, right, left_index=True, right_index=True, how="left")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.merge(left, right, left_index=True, right_index=True, how="inner")
    pd.merge(left, right, left_index=True, right_index=True, how="outer")
    pd.merge(left, right, left_index=True, right_index=True, how="left")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "merge_index_join", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
