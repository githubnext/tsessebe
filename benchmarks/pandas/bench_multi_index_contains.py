"""Benchmark: MultiIndex.__contains__ (pandas equivalent)."""
import json
import time
import pandas as pd

SIZE = 5_000
WARMUP = 5
ITERATIONS = 50

arr1 = [f"a{i % 50}" for i in range(SIZE)]
arr2 = [i % 100 for i in range(SIZE)]
mi = pd.MultiIndex.from_arrays([arr1, arr2])

for _ in range(WARMUP):
    ("a0", 0) in mi

t0 = time.perf_counter()
for i in range(ITERATIONS):
    (f"a{i % 50}", i % 100) in mi
total = (time.perf_counter() - t0) * 1000

print(json.dumps({"function": "multi_index_contains", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
