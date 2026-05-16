"""Benchmark: Series.combine / DataFrame.combine — element-wise binary combine."""
import json
import time
import pandas as pd
import numpy as np

SIZE = 10_000
WARMUP = 5
ITERATIONS = 100

a = pd.Series(range(SIZE))
b = pd.Series(range(SIZE, 0, -1))

df_a = pd.DataFrame({"x": range(SIZE), "y": [i * 2 for i in range(SIZE)]})
df_b = pd.DataFrame({"x": range(SIZE, 0, -1), "z": [i * 3 for i in range(SIZE)]})

add_fn = lambda p, q: p + q

for _ in range(WARMUP):
    a.combine(b, add_fn, fill_value=0)
    df_a.combine(df_b, add_fn, fill_value=0)

start = time.perf_counter()
for _ in range(ITERATIONS):
    a.combine(b, add_fn, fill_value=0)
    df_a.combine(df_b, add_fn, fill_value=0)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "combine",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
