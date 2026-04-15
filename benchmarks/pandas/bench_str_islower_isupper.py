"""Benchmark: str_islower_isupper — str.islower and str.isupper on 100k strings"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = ["hello" if i % 2 == 0 else "WORLD" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.islower()
    s.str.isupper()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.islower()
    s.str.isupper()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_islower_isupper",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
