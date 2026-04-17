"""
Benchmark: DataFrame ceil / floor / trunc / sqrt — math rounding on 100k-row DataFrame.
Outputs JSON: {"function": "dataframe_ceil_floor_trunc", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": (np.arange(ROWS) % 1000) * 0.7 + 0.3,
    "b": (np.arange(ROWS) % 500) * 1.3 + 0.1,
})

for _ in range(WARMUP):
    np.ceil(df)
    np.floor(df)
    np.trunc(df)
    np.sqrt(df)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.ceil(df)
    np.floor(df)
    np.trunc(df)
    np.sqrt(df)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_ceil_floor_trunc",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
