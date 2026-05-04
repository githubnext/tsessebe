"""Benchmark: DataFrame.query and DataFrame.eval on a 100k-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "a": np.arange(ROWS) * 0.5,
    "b": (ROWS - np.arange(ROWS)) * 0.3,
    "c": (np.arange(ROWS) % 100) * 1.0,
})

for _ in range(WARMUP):
    df.query("a > 10000 and b < 20000")
    df.eval("a + b * 2")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.query("a > 10000 and b < 20000")
    df.eval("a + b * 2")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "eval_query",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
