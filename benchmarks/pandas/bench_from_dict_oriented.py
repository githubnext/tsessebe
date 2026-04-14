"""Benchmark: pd.DataFrame.from_records on 10k records"""
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
records = [{"id": i, "val": i * 1.5, "name": f"item_{i}"} for i in range(ROWS)]

for _ in range(WARMUP):
    pd.DataFrame.from_records(records)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.DataFrame.from_records(records)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "from_dict_oriented", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
