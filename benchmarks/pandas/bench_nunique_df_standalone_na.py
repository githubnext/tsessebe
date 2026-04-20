"""
Benchmark: DataFrame.nunique() — count unique values per column.
Outputs JSON: {"function": "nunique_df_standalone_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 100

df = pd.DataFrame({
    "a": np.arange(ROWS) % 100,
    "b": np.arange(ROWS) % 50,
    "c": np.arange(ROWS) % 200,
    "d": [None if i % 10 == 0 else i % 75 for i in range(ROWS)],
    "e": np.arange(ROWS) % 500,
})

for _ in range(WARMUP):
    df.nunique()
    df.nunique(axis=0)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.nunique()
    df.nunique(axis=0)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "nunique_df_standalone_na",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
