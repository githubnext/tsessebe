"""Benchmark: pivot_table — pivot aggregation on 100k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

rows = [f"row_{i % 100}" for i in range(ROWS)]
cols = [f"col_{i % 50}" for i in range(ROWS)]
vals = np.arange(ROWS, dtype=np.float64) * 0.1
df = pd.DataFrame({"row": rows, "col": cols, "value": vals})

for _ in range(WARMUP):
    df.pivot_table(values="value", index="row", columns="col", aggfunc="mean")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.pivot_table(values="value", index="row", columns="col", aggfunc="mean")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pivot_table",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
