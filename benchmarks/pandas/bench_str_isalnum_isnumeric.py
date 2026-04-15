"""Benchmark: str_isalnum_isnumeric — str.isalnum and str.isnumeric on 100k strings"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = ["abc123" if i % 3 == 0 else ("12345" if i % 3 == 1 else "hello!") for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.isalnum()
    s.str.isnumeric()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.isalnum()
    s.str.isnumeric()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_isalnum_isnumeric",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
