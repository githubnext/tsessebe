"""Benchmark: DataFrame.expanding().std() and .var() on 10k-row DataFrame."""
import pandas as pd
import numpy as np
import json
import time

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

a = np.sin(np.arange(ROWS) * 0.01) * 100
b = np.cos(np.arange(ROWS) * 0.01) * 50
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.expanding().std()
    df.expanding().var()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.expanding().std()
    df.expanding().var()
total = time.perf_counter() - start

print(json.dumps({
    "function": "dataframe_expanding_std_var",
    "mean_ms": total / ITERATIONS * 1000,
    "iterations": ITERATIONS,
    "total_ms": total * 1000,
}))
