"""
Benchmark: pandas DataFrame.diff() / DataFrame.shift() — discrete difference and shift.
Outputs JSON: {"function": "dataframe_diff_shift_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

df = pd.DataFrame({
    "a": np.arange(SIZE, dtype=float),
    "b": np.sin(np.arange(SIZE) * 0.01) * 100,
    "c": np.arange(SIZE) * 2.5,
})

for _ in range(WARMUP):
    df.diff()
    df.diff(periods=3)
    df.shift(1)
    df.shift(-2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.diff()
    df.diff(periods=3)
    df.shift(1)
    df.shift(-2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_diff_shift_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
