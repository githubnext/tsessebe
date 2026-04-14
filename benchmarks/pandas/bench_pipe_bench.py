"""Benchmark: pipe with 3 transforms on a 100k-element pandas Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
s = pd.Series([i * 0.5 for i in range(ROWS)])

double = lambda x: x * 2
add_one = lambda x: x + 1
absfn = lambda x: x.abs()

for _ in range(WARMUP):
    s.pipe(double).pipe(add_one).pipe(absfn)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.pipe(double).pipe(add_one).pipe(absfn)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "pipe_bench", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
