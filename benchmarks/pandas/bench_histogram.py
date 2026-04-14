"""Benchmark: np.histogram on 100k-element array"""
import json, time
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = np.array([(i % 1000) * 0.1 for i in range(ROWS)])

for _ in range(WARMUP):
    np.histogram(data, bins=50)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.histogram(data, bins=50)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "histogram", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
