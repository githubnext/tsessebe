"""Benchmark: apply formatter to 100k-element pandas Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
s = pd.Series([i * 1.234 for i in range(ROWS)])

for _ in range(WARMUP):
    s.map(lambda v: f"{v:.2f}")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.map(lambda v: f"{v:.2f}")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "apply_series_formatter", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
