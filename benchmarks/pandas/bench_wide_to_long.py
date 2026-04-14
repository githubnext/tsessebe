"""Benchmark: wide_to_long on 1000x4 DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 1_000
WARMUP = 3
ITERATIONS = 10

ids = list(range(ROWS))
df = pd.DataFrame({
    "id": ids,
    "value_2020": [i * 1.0 for i in ids],
    "value_2021": [i * 1.1 for i in ids],
    "value_2022": [i * 1.2 for i in ids],
})

for _ in range(WARMUP):
    pd.wide_to_long(df, stubnames=["value"], i="id", j="year", sep="_")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.wide_to_long(df, stubnames=["value"], i="id", j="year", sep="_")
total = (time.perf_counter() - start) * 1000

print(json.dumps({ "function": "wide_to_long", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
