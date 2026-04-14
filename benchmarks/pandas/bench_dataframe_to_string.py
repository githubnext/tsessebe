"""Benchmark: DataFrame.to_string on 1k-row pandas DataFrame"""
import json, time
import pandas as pd

ROWS = 1_000
WARMUP = 3
ITERATIONS = 10
df = pd.DataFrame({"a": range(ROWS), "b": [i * 1.5 for i in range(ROWS)]})

for _ in range(WARMUP):
    df.to_string()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_string()
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "dataframe_to_string", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
