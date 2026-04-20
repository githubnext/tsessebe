"""
Benchmark: DataFrame.diff() / shift() — diff and shift on 10k-row DataFrame.
Outputs JSON: {"function": "diff_shift_df_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": np.arange(ROWS) * 2.0,
    "b": np.arange(ROWS) * 3.0,
    "c": np.arange(ROWS) * 0.5,
})

for _ in range(WARMUP):
    df.diff(periods=1)
    df.shift(periods=2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.diff(periods=1)
    df.shift(periods=2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "diff_shift_df_na",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
