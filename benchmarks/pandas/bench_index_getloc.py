"""Benchmark: Index.get_loc (pandas equivalent)."""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 30

idx = pd.Index(range(SIZE))

for _ in range(WARMUP):
    idx.get_loc(5000)

t0 = time.perf_counter()
for i in range(ITERATIONS):
    idx.get_loc(i % SIZE)
total = (time.perf_counter() - t0) * 1000

print(json.dumps({"function": "index_getloc", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
