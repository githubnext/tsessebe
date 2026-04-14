"""Benchmark: str normalize on 100k-element string Series"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [f"caf\u00e9 {i}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.normalize("NFC")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.normalize("NFC")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_normalize", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
