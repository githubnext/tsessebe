"""Benchmark: DataFrame.map formatter on 10k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
df = pd.DataFrame({"a": [i * 1.234 for i in range(ROWS)], "b": [i * 5.678 for i in range(ROWS)]})

for _ in range(WARMUP):
    df.map(lambda v: f"{v:.2f}")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.map(lambda v: f"{v:.2f}")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "apply_dataframe_formatter", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
