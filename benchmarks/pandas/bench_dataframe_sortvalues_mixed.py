"""Benchmark: DataFrame.sort_values with mixed ascending list [True, False, True]."""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame({
    "category": [f"group_{i % 10}" for i in range(ROWS)],
    "priority": [i % 5 for i in range(ROWS)],
    "value": np.random.random(ROWS) * 1000,
})

for _ in range(WARMUP):
    df.sort_values(["category", "priority", "value"], ascending=[True, False, True])
    df.sort_values(["category", "value"], ascending=[False, True])

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.sort_values(["category", "priority", "value"], ascending=[True, False, True])
    df.sort_values(["category", "value"], ascending=[False, True])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_sortvalues_mixed",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
