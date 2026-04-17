"""Benchmark: Series.sample(frac=...) and DataFrame.sample(frac=...) —
fractional sampling (10% of 100k elements) with and without replacement."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

data = np.arange(ROWS, dtype=float) * 1.5
s = pd.Series(data)
df = pd.DataFrame({
    "a": np.arange(ROWS, dtype=float),
    "b": np.arange(ROWS, dtype=float) * 2.0,
    "c": np.arange(ROWS, dtype=float) * 3.0,
})

for _ in range(WARMUP):
    s.sample(frac=0.1)
    s.sample(frac=0.05, replace=True)
    df.sample(frac=0.1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.sample(frac=0.1)
    s.sample(frac=0.05, replace=True)
    df.sample(frac=0.1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "sample_frac",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
