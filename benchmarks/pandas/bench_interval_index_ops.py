"""Benchmark: IntervalIndex contains / get_loc — interval index lookup ops on 1k-interval index."""
import json
import time
import numpy as np
import pandas as pd

BREAKS = 1_001  # 1000 intervals
QUERIES = 10_000
WARMUP = 5
ITERATIONS = 50

breaks = np.arange(BREAKS) * 0.1
idx = pd.IntervalIndex.from_breaks(breaks)

# Query values spread across the range
query_values = (np.arange(QUERIES) / QUERIES) * (BREAKS - 1) * 0.1

for _ in range(WARMUP):
    for q in query_values[:100]:
        idx.contains(q)
        idx.get_loc(q)

start = time.perf_counter()
for _ in range(ITERATIONS):
    for q in query_values:
        idx.contains(q)
        idx.get_loc(q)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "interval_index_ops", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
