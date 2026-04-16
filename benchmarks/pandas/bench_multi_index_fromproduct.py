"""Benchmark: MultiIndex.from_product (pandas equivalent)."""
import json
import time
import pandas as pd

WARMUP = 3
ITERATIONS = 30

level1 = [f"a{i}" for i in range(50)]
level2 = list(range(100))

for _ in range(WARMUP):
    pd.MultiIndex.from_product([level1, level2])

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    pd.MultiIndex.from_product([level1, level2])
total = (time.perf_counter() - t0) * 1000

print(json.dumps({"function": "multi_index_fromproduct", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
