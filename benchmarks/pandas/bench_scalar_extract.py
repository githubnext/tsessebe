"""Benchmark: scalar extraction utilities (squeeze, first_valid_index, last_valid_index) on 100k rows"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

# Series with some leading/trailing nulls
data = [None if (i < 100 or i >= ROWS - 100) else i * 0.1 for i in range(ROWS)]
s = pd.Series(data)
s1 = pd.Series([42])

# DataFrame with some nulls
col_a = [None if i < 50 else i * 1.0 for i in range(ROWS)]
col_b = [None if i >= ROWS - 50 else i * 2.0 for i in range(ROWS)]
df = pd.DataFrame({"A": col_a, "B": col_b})
df1col = pd.DataFrame({"A": col_a})

# Warm up
for _ in range(WARMUP):
    s.first_valid_index()
    s.last_valid_index()
    df.first_valid_index()
    df.last_valid_index()
    s1.squeeze()
    df1col.squeeze(axis=1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.first_valid_index()
    s.last_valid_index()
    df.first_valid_index()
    df.last_valid_index()
    s1.squeeze()
    df1col.squeeze(axis=1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "scalar_extract",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
