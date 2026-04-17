"""Benchmark: Series.to_numpy() and .tolist() — convert 100k-element Series to plain arrays."""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 10
ITERATIONS = 100

s = pd.Series([i * 2.5 for i in range(SIZE)])

for _ in range(WARMUP):
    s.to_numpy()
    s.tolist()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.to_numpy()
    s.tolist()
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({"function": "series_to_array", "mean_ms": round(total / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total, 3)}))
