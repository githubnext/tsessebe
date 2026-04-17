"""Benchmark: value_counts with options — normalize=True, ascending=True, dropna=False."""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

data = [None if i % 500 == 0 else f"cat_{i % 50}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.value_counts(normalize=True)
    s.value_counts(ascending=True)
    s.value_counts(dropna=False)
    s.value_counts(normalize=True, ascending=True, dropna=False)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.value_counts(normalize=True)
    s.value_counts(ascending=True)
    s.value_counts(dropna=False)
    s.value_counts(normalize=True, ascending=True, dropna=False)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "value_counts_opts",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
