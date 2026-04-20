"""
Benchmark: pandas DataFrame.ffill() / DataFrame.bfill() — forward/backward fill.
Outputs JSON: {"function": "dataframe_ffill_bfill_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

df = pd.DataFrame({
    "a": [float("nan") if i % 5 == 0 else i * 0.1 for i in range(SIZE)],
    "b": [float("nan") if i % 7 == 0 else i * 2.0 for i in range(SIZE)],
    "c": [float("nan") if i % 3 == 0 else i * 0.5 for i in range(SIZE)],
})

for _ in range(WARMUP):
    df.ffill()
    df.bfill()
    df.ffill(limit=3)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.ffill()
    df.bfill()
    df.ffill(limit=3)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_ffill_bfill_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
