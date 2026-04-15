"""Benchmark: str_istitle_isspace — str.istitle and str.isspace on 100k strings"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = ["Hello World" if i % 3 == 0 else ("   " if i % 3 == 1 else "hello world") for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.istitle()
    s.str.isspace()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.istitle()
    s.str.isspace()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_istitle_isspace",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
