"""Benchmark: DataFrame.insert() and DataFrame.pop() on a 10k-row DataFrame.

Mirrors tsb's insertColumn, popColumn, reorderColumns, moveColumn benchmarks.
"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

data = np.arange(ROWS)
df = pd.DataFrame({"a": data, "b": data, "c": data, "d": data})
extra_col = data * 2

def run():
    df2 = df.copy()
    df2.insert(2, "x", extra_col)
    df2.pop("x")
    df[["d", "c", "b", "a"]]   # reorderColumns
    df[["c", "a", "b", "d"]]   # moveColumn equivalent

for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "insert_pop",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
