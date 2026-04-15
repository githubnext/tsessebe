"""Benchmark: str_encode — str.encode byte-length encoding on 100k strings"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"hello world {i}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.encode("utf-8")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.encode("utf-8")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_encode",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
