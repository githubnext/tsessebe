"""Benchmark: keepTrue / keepFalse equivalent — boolean mask filtering on a 100k-element Series"""
import json
import time
import pandas as pd
import numpy as np

N = 100_000
WARMUP = 2
ITERATIONS = 5

data = list(range(N))
mask = [i % 2 == 0 for i in range(N)]
s = pd.Series(data, dtype=float)
bool_mask = pd.array(mask, dtype=bool)

for _ in range(WARMUP):
    s[bool_mask]
    s[~bool_mask]

start = time.perf_counter()
for _ in range(ITERATIONS):
    s[bool_mask]
    s[~bool_mask]
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "keep_true_false",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
