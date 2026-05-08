"""
Benchmark: dropna on Series and DataFrame (axis=0, how=any, how=all)
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

rng = np.random.default_rng(42)
series_data = rng.standard_normal(ROWS)
series_data[::10] = np.nan
s = pd.Series(series_data)

col_a = rng.standard_normal(ROWS)
col_b = rng.standard_normal(ROWS)
col_c = rng.standard_normal(ROWS)
col_a[::7] = np.nan
col_b[::11] = np.nan
col_c[::13] = np.nan
df = pd.DataFrame({"a": col_a, "b": col_b, "c": col_c})

for _ in range(WARMUP):
    s.dropna()
    df.dropna(how="any")
    df.dropna(how="all")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.dropna()
    df.dropna(how="any")
    df.dropna(how="all")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dropna",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
