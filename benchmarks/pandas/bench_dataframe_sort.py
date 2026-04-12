"""Benchmark: dataframe_sort — sort a 100k-row DataFrame by two columns"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

rng = np.random.default_rng(42)
a = [f"group_{i % 100}" for i in range(ROWS)]
b = rng.random(ROWS) * 1000
df = pd.DataFrame({"a": a, "b": b})

for _ in range(WARMUP):
    df.sort_values(["a", "b"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.sort_values(["a", "b"])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_sort",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
