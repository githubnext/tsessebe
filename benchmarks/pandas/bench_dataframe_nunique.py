"""
Benchmark: DataFrame.nunique() — count unique values per column on 100k-row DataFrame.
Outputs JSON: {"function": "dataframe_nunique", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

df = pd.DataFrame({
    "cat": np.arange(SIZE) % 100,
    "val": np.arange(SIZE) % 500,
    "grp": np.arange(SIZE) % 10,
})

for _ in range(WARMUP):
    df.nunique()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.nunique()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_nunique",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
