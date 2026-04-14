"""Benchmark: DataFrame covariance matrix on 1000x10 DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 1_000
COLS = 10
WARMUP = 3
ITERATIONS = 10

data = {f"col{c}": np.sin(np.arange(ROWS) * 0.01 + c) for c in range(COLS)}
df = pd.DataFrame(data)

for _ in range(WARMUP):
    df.cov()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.cov()
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "dataframe_cov", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
