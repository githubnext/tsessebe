"""Benchmark: DataFrame.stack with dropna=True/False options — includes null values
in the output on a 2k-row x 5-column DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 2_000
WARMUP = 5
ITERATIONS = 30

def make_col(mul: float) -> list:
    return [None if i % 10 == 0 else float(i) * mul for i in range(ROWS)]

df = pd.DataFrame({
    "a": make_col(1.0),
    "b": make_col(1.1),
    "c": make_col(1.2),
    "d": make_col(1.3),
    "e": make_col(1.4),
})

for _ in range(WARMUP):
    df.stack(dropna=True)
    df.stack(dropna=False)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.stack(dropna=True)
    df.stack(dropna=False)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "stack_options",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
