"""Benchmark: np.digitize on 100k-element array"""
import json, time
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = np.array([i * 0.001 for i in range(ROWS)])
bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

for _ in range(WARMUP):
    np.digitize(data, bins)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.digitize(data, bins)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "series_digitize", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
