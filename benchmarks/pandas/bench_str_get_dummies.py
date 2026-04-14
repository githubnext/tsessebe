"""Benchmark: str.get_dummies on 10k-element string Series"""
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
data = [f"a|b|{chr(97 + (i % 5))}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.get_dummies(sep="|")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.get_dummies(sep="|")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_get_dummies", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
