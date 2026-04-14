"""Benchmark: to_json — serialize a 10k-row DataFrame to JSON string"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "id": np.arange(ROWS, dtype=float),
    "value": np.arange(ROWS) * 1.1,
    "score": np.sin(np.arange(ROWS) * 0.01),
})

for _ in range(WARMUP):
    df.to_json(orient="records")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_json(orient="records")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "to_json",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
