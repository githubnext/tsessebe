"""Benchmark: np.argsort / np.searchsorted — sort/search utilities on 100k-element arrays."""
import json
import time
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

arr = np.sin(np.arange(SIZE) * 0.001) * SIZE
sorted_arr = np.sort(arr)
queries = (np.arange(1000) - 500) * SIZE / 500

for _ in range(WARMUP):
    np.argsort(arr)
    np.searchsorted(sorted_arr, queries)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.argsort(arr)
    np.searchsorted(sorted_arr, queries)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "argsort_scalars", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
