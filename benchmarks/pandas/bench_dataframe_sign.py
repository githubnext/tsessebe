"""Benchmark: DataFrame sign operation — np.sign on 100k-row DataFrame."""
import json
import time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": (np.arange(ROWS) % 200) - 100,
    "b": np.sin(np.arange(ROWS) * 0.01) * 1000,
    "c": (np.arange(ROWS) % 3) - 1,
})

for _ in range(WARMUP):
    np.sign(df)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.sign(df)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "dataframe_sign", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
