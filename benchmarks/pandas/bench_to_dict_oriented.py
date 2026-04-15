"""Benchmark: DataFrame to_dict(orient='records') on 1000x5 DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 1_000
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame({
    "a": np.arange(ROWS, dtype=float),
    "b": np.arange(ROWS, dtype=float) * 2,
    "c": np.arange(ROWS, dtype=float) * 3,
    "d": [f"str{i}" for i in range(ROWS)],
    "e": np.arange(ROWS, dtype=float) * 0.5,
})

for _ in range(WARMUP):
    df.to_dict(orient="records")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_dict(orient="records")
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "to_dict_oriented", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
