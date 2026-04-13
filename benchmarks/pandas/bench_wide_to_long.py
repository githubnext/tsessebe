"""Benchmark: wide_to_long reshape on a 1k-row DataFrame with 10 year columns"""
import json, time
import numpy as np
import pandas as pd

ROWS = 1_000
WARMUP = 5
ITERATIONS = 20

data = {"id": [f"id{i}" for i in range(ROWS)]}
for y in range(2010, 2020):
    data[f"value{y}"] = [i * y * 0.001 for i in range(ROWS)]
df = pd.DataFrame(data)

for _ in range(WARMUP):
    pd.wide_to_long(df, stubnames=["value"], i=["id"], j="year")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.wide_to_long(df, stubnames=["value"], i=["id"], j="year")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "wide_to_long",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
