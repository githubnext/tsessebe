"""Benchmark: np.arange and np.linspace generating 100k-element arrays"""
import json, time
import numpy as np

N = 100_000
WARMUP = 3
ITERATIONS = 10

for _ in range(WARMUP):
    np.arange(0, N, 1)
    np.linspace(0, 1, N)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.arange(0, N, 1)
    np.linspace(0, 1, N)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "arange_linspace", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
