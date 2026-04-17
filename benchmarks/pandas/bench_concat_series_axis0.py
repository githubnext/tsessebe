"""Benchmark: pd.concat of multiple Series along axis=0 — vertical stacking
of 5 Series of 20k elements each."""
import json, time
import numpy as np
import pandas as pd

CHUNK = 20_000
WARMUP = 5
ITERATIONS = 30

s1 = pd.Series(np.arange(CHUNK, dtype=float) * 1.0)
s2 = pd.Series(np.arange(CHUNK, dtype=float) * 2.0)
s3 = pd.Series(np.arange(CHUNK, dtype=float) * 3.0)
s4 = pd.Series(np.arange(CHUNK, dtype=float) * 4.0)
s5 = pd.Series(np.arange(CHUNK, dtype=float) * 5.0)

for _ in range(WARMUP):
    pd.concat([s1, s2, s3, s4, s5])

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.concat([s1, s2, s3, s4, s5])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "concat_series_axis0",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
