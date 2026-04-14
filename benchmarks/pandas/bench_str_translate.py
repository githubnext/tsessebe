"""Benchmark: str.translate on 100k-element string Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [f"hello world {i}" for i in range(ROWS)]
s = pd.Series(data)
table = str.maketrans({"h": "H", "w": "W", "o": "0"})

for _ in range(WARMUP):
    s.str.translate(table)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.translate(table)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_translate", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
