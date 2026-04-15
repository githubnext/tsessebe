"""Benchmark: str_rsplit — pandas str.rsplit() on 100k strings"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"part_{i % 100}_b_c_d" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    _ = s.str.rsplit("_", n=2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = s.str.rsplit("_", n=2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "str_rsplit", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
