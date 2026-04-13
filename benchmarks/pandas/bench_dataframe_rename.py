"""Benchmark: dataframe_rename — rename columns in a 100k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

a = np.arange(ROWS, dtype=np.float64) * 1.1
b = np.arange(ROWS, dtype=np.float64) * 2.2
df = pd.DataFrame({"old_a": a, "old_b": b})

for _ in range(WARMUP):
    df.rename(columns={"old_a": "new_a", "old_b": "new_b"})

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.rename(columns={"old_a": "new_a", "old_b": "new_b"})
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_rename",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
