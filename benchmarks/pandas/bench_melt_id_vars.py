"""Benchmark: pd.melt with id_vars — unpivot keeping identifier columns fixed,
with custom var_name and value_name on a 10k-row DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 30

ids = [f"id_{i}" for i in range(ROWS)]
category = ["A", "B", "C"][ : ROWS]
category = [["A", "B", "C"][i % 3] for i in range(ROWS)]
q1 = np.arange(ROWS, dtype=float)
q2 = np.arange(ROWS, dtype=float) * 1.1
q3 = np.arange(ROWS, dtype=float) * 1.2
q4 = np.arange(ROWS, dtype=float) * 1.3

df = pd.DataFrame({"id": ids, "category": category, "Q1": q1, "Q2": q2, "Q3": q3, "Q4": q4})

for _ in range(WARMUP):
    pd.melt(df, id_vars=["id", "category"], var_name="quarter", value_name="revenue")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.melt(df, id_vars=["id", "category"], var_name="quarter", value_name="revenue")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "melt_id_vars",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
