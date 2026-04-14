"""Benchmark: melt (wide to long) on 10k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "A": np.arange(ROWS) * 0.1,
    "B": np.arange(ROWS) * 0.2,
    "C": np.arange(ROWS) * 0.3,
})

for _ in range(WARMUP):
    df.melt(value_vars=["A", "B", "C"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.melt(value_vars=["A", "B", "C"])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "melt",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
