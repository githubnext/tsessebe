"""Benchmark: str_count — str.count occurrences of pattern on 100k strings"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"abc abc abc {'abc' if i % 5 == 0 else 'xyz'}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.count("abc")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.count("abc")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_count",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
