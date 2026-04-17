"""
Benchmark: DataFrame.align — align two 10k-row DataFrames on inner/outer/left join.
Outputs JSON: {"function": "align_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 30

idx_a = [i * 2 for i in range(SIZE)]
idx_b = [i * 3 for i in range(SIZE)]

df_a = pd.DataFrame(
    {"x": [i * 1.0 for i in range(SIZE)], "y": [i * 2.0 for i in range(SIZE)], "z": [i * 3.0 for i in range(SIZE)]},
    index=idx_a,
)
df_b = pd.DataFrame(
    {"y": [i * 10.0 for i in range(SIZE)], "z": [i * 20.0 for i in range(SIZE)], "w": [i * 30.0 for i in range(SIZE)]},
    index=idx_b,
)

for _ in range(WARMUP):
    df_a.align(df_b, join="inner")
    df_a.align(df_b, join="outer")
    df_a.align(df_b, join="left")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df_a.align(df_b, join="inner")
    df_a.align(df_b, join="outer")
    df_a.align(df_b, join="left")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "align_dataframe",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
