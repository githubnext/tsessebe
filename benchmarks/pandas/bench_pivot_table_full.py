"""
Benchmark: pivot_table with margins on 50k-row DataFrame.
Outputs JSON: {"function": "pivot_table_full", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 50_000
WARMUP = 3
ITERATIONS = 20

regions = ["North", "South", "East", "West"]
products = ["A", "B", "C", "D", "E"]

df = pd.DataFrame({
    "region": [regions[i % len(regions)] for i in range(ROWS)],
    "product": [products[i % len(products)] for i in range(ROWS)],
    "sales": (np.arange(ROWS) % 1000) * 1.5 + 10,
})

for _ in range(WARMUP):
    pd.pivot_table(df, values="sales", index="region", columns="product", aggfunc="mean", margins=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.pivot_table(df, values="sales", index="region", columns="product", aggfunc="mean", margins=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pivot_table_full",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
