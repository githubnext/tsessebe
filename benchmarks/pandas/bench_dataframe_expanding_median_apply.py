"""Benchmark: DataFrame.expanding().median() and .apply(fn) on 10k-row DataFrame."""
import pandas as pd
import numpy as np
import json
import time

ROWS = 10_000
WARMUP = 2
ITERATIONS = 5

a = np.sin(np.arange(ROWS) * 0.05) * 100
b = np.cos(np.arange(ROWS) * 0.05) * 80
df = pd.DataFrame({"a": a, "b": b})

sum_fn = lambda x: x.sum()

for _ in range(WARMUP):
    df.expanding().median()
    df.expanding().apply(sum_fn, raw=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.expanding().median()
    df.expanding().apply(sum_fn, raw=True)
total = time.perf_counter() - start

print(json.dumps({
    "function": "dataframe_expanding_median_apply",
    "mean_ms": total / ITERATIONS * 1000,
    "iterations": ITERATIONS,
    "total_ms": total * 1000,
}))
