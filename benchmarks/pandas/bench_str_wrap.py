"""Benchmark: str_wrap — str.wrap word wrapping on 100k strings"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = ["the quick brown fox jumps over the lazy dog"] * ROWS
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.wrap(20)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.wrap(20)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_wrap",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
