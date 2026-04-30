"""Benchmark: Series.transform — transform a 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = (np.arange(ROWS) % 500) + 1.0
idx = np.arange(ROWS) % 500
s = pd.Series(data, index=idx)

for _ in range(WARMUP):
    s.transform("mean")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.transform("mean")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "transform_agg",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
