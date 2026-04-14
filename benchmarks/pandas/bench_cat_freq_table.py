"""Benchmark: value_counts on 100k-element categorical Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
cats = ["low", "med", "high", "ultra"]
s = pd.Series([cats[i % 4] for i in range(ROWS)])

for _ in range(WARMUP):
    s.value_counts()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.value_counts()
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "cat_freq_table", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
