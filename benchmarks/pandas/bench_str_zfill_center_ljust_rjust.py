"""Benchmark: str_zfill_center_ljust_rjust — padding operations on 100k strings"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [str(i) for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.zfill(10)
    s.str.center(10)
    s.str.ljust(10)
    s.str.rjust(10)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.zfill(10)
    s.str.center(10)
    s.str.ljust(10)
    s.str.rjust(10)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_zfill_center_ljust_rjust",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
