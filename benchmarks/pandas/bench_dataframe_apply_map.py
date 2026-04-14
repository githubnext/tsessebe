"""Benchmark: DataFrame.map element-wise on 10k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
df = pd.DataFrame({"a": [i * 0.1 for i in range(ROWS)], "b": [i * 0.2 for i in range(ROWS)]})

for _ in range(WARMUP):
    df.map(lambda v: v + 1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.map(lambda v: v + 1)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "dataframe_apply_map", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
