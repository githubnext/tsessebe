"""Benchmark: DataFrame.expanding().sum() and .count() on 10k-row DataFrame."""
import pandas as pd
import numpy as np
import json
import time

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

a = (np.arange(ROWS) % 100) * 1.5
b = (np.arange(ROWS) % 50) * 2.0
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.expanding().sum()
    df.expanding().count()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.expanding().sum()
    df.expanding().count()
total = time.perf_counter() - start

print(json.dumps({
    "function": "dataframe_expanding_sum_count",
    "mean_ms": total / ITERATIONS * 1000,
    "iterations": ITERATIONS,
    "total_ms": total * 1000,
}))
