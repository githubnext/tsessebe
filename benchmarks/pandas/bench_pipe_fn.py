"""Benchmark: pipe — functional pipeline composition via pandas Series.pipe on 100k-element Series."""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series((np.arange(SIZE) % 200) - 100.0)
df = pd.DataFrame({
    "a": (np.arange(SIZE) % 100) - 50.0,
    "b": np.sin(np.arange(SIZE) * 0.01) * 100,
})

def double(x: pd.Series) -> pd.Series:
    return x * 2

def add_hundred(x: pd.Series) -> pd.Series:
    return x + 100

def abs_series(x: pd.Series) -> pd.Series:
    return x.abs()

for _ in range(WARMUP):
    s.pipe(abs_series).pipe(double).pipe(add_hundred)

times = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    s.pipe(abs_series).pipe(double).pipe(add_hundred)
    times.append((time.perf_counter() - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({"function": "pipe_fn", "mean_ms": mean_ms, "iterations": ITERATIONS, "total_ms": total_ms}))
