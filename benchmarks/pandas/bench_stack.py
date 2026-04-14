"""Benchmark: DataFrame stack on 1000x5 DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 1_000
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame({
    "a": np.arange(ROWS, dtype=float),
    "b": np.arange(ROWS, dtype=float) * 2,
    "c": np.arange(ROWS, dtype=float) * 3,
    "d": np.arange(ROWS, dtype=float) * 4,
    "e": np.arange(ROWS, dtype=float) * 5,
})

for _ in range(WARMUP):
    df.stack(future_stack=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.stack(future_stack=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "stack", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
