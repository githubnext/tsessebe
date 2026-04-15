"""Benchmark: EWM var (span=20) on 100k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = np.sin(np.arange(ROWS) * 0.01)
s = pd.Series(data)

for _ in range(WARMUP):
    s.ewm(span=20).var()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.ewm(span=20).var()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "ewm_var",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
