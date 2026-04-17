"""Benchmark: DataFrame.combine_first — fill NaN values from another DataFrame (union of indexes).
Mirrors tsb bench_combine_first_dataframe.ts.
"""
import json, time
import numpy as np
import pandas as pd

SIZE = 5_000
WARMUP = 5
ITERATIONS = 30

rows1 = list(range(SIZE))
data1a = [None if i % 3 == 0 else i * 1.5 for i in range(SIZE)]
data1b = [None if i % 5 == 0 else i * 0.5 for i in range(SIZE)]
df1 = pd.DataFrame({"a": data1a, "b": data1b}, index=rows1)

rows2 = list(range(SIZE + 500))
data2a = [i * 2.0 for i in range(SIZE + 500)]
data2b = [i * 1.0 for i in range(SIZE + 500)]
data2c = [i * 0.1 for i in range(SIZE + 500)]
df2 = pd.DataFrame({"a": data2a, "b": data2b, "c": data2c}, index=rows2)

for _ in range(WARMUP):
    df1.combine_first(df2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df1.combine_first(df2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "combine_first_dataframe",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
