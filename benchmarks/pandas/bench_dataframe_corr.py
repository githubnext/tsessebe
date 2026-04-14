"""Benchmark: DataFrame correlation matrix on 10k-row x 5-column DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "A": np.sin(np.arange(ROWS) * 0.01),
    "B": np.cos(np.arange(ROWS) * 0.01),
    "C": np.sin(np.arange(ROWS) * 0.02),
    "D": np.cos(np.arange(ROWS) * 0.02),
    "E": np.sin(np.arange(ROWS) * 0.03),
})

for _ in range(WARMUP):
    df.corr()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.corr()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_corr",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
