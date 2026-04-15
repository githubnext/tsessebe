"""Benchmark: DataFrame insert column on 10000x3 DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

new_col = np.arange(ROWS, dtype=float) * 4

def make_df():
    return pd.DataFrame({
        "a": np.arange(ROWS, dtype=float),
        "b": np.arange(ROWS, dtype=float) * 2,
        "c": np.arange(ROWS, dtype=float) * 3,
    })

for _ in range(WARMUP):
    df = make_df()
    df.insert(1, "new_col", new_col)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df = make_df()
    df.insert(1, "new_col", new_col)
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "insert_column", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
