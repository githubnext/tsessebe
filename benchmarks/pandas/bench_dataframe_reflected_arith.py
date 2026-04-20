"""Benchmark: dataframe_reflected_arith — DataFrame.radd / rsub / rmul / rdiv."""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": np.arange(ROWS) * 1.5,
    "b": (np.arange(ROWS) % 100) + 1.0,
    "c": np.arange(ROWS) * 0.25,
})

for _ in range(WARMUP):
    df.radd(10)
    df.rsub(1000)
    df.rmul(3)
    df.rdiv(100)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.radd(10)
    df.rsub(1000)
    df.rmul(3)
    df.rdiv(100)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_reflected_arith",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
