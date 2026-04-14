"""Benchmark: pd.crosstab on two 100k-element categorical Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
cats1 = ["a", "b", "c", "d"]
cats2 = ["x", "y", "z"]
s1 = pd.Series([cats1[i % 4] for i in range(ROWS)])
s2 = pd.Series([cats2[i % 3] for i in range(ROWS)])

for _ in range(WARMUP):
    pd.crosstab(s1, s2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.crosstab(s1, s2)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "cat_cross_tab", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
