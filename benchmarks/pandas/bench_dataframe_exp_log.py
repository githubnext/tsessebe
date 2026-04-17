"""
Benchmark: DataFrame exp / log / log2 / log10 — exponentiation/log on 100k-row DataFrame.
Outputs JSON: {"function": "dataframe_exp_log", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": (np.arange(ROWS) % 1000) + 1,
    "b": (np.arange(ROWS) % 500) + 1,
})

for _ in range(WARMUP):
    np.exp(df)
    np.log(df)
    np.log2(df)
    np.log10(df)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.exp(df)
    np.log(df)
    np.log2(df)
    np.log10(df)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_exp_log",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
