"""Benchmark: multiple str.replace on 100k-element string Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [f"foo bar baz {i}" for i in range(ROWS)]
s = pd.Series(data)
pairs = [("foo", "alpha"), ("bar", "beta"), ("baz", "gamma")]

for _ in range(WARMUP):
    tmp = s
    for old, new in pairs:
        tmp = tmp.str.replace(old, new, regex=False)

start = time.perf_counter()
for _ in range(ITERATIONS):
    tmp = s
    for old, new in pairs:
        tmp = tmp.str.replace(old, new, regex=False)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_multi_replace", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
