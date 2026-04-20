"""
Benchmark: DataFrame.ffill() / bfill() — forward/backward fill on 10k-row DataFrame.
Outputs JSON: {"function": "ffill_bfill_df_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 50

data = {}
for col, offset in zip("abcde", range(5)):
    arr = np.arange(ROWS, dtype=float) + offset
    arr[::10] = np.nan
    data[col] = arr
df = pd.DataFrame(data)

for _ in range(WARMUP):
    df.ffill()
    df.bfill()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.ffill()
    df.bfill()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "ffill_bfill_df_na",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
