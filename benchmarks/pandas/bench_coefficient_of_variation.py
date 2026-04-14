"""Benchmark: coefficient of variation on 100k-element Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
s = pd.Series([i * 0.1 + 1 for i in range(ROWS)])

def cv(x):
    return x.std() / x.mean()

for _ in range(WARMUP):
    cv(s)

start = time.perf_counter()
for _ in range(ITERATIONS):
    cv(s)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "coefficient_of_variation", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
