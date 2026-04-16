"""Benchmark: MultiIndex.from_arrays (pandas equivalent)."""
import json
import time
import pandas as pd

SIZE = 5_000
WARMUP = 3
ITERATIONS = 20

arr1 = [f"a{i % 50}" for i in range(SIZE)]
arr2 = [i % 100 for i in range(SIZE)]

for _ in range(WARMUP):
    pd.MultiIndex.from_arrays([arr1, arr2])

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    pd.MultiIndex.from_arrays([arr1, arr2])
total = (time.perf_counter() - t0) * 1000

print(json.dumps({"function": "multi_index_fromarrays", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
