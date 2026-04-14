"""Benchmark: DataFrame rolling mean on 100k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
df = pd.DataFrame({"a": [i * 0.1 for i in range(ROWS)], "b": [i * 0.2 for i in range(ROWS)]})

for _ in range(WARMUP):
    df.rolling(10).mean()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.rolling(10).mean()
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "dataframe_rolling", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
