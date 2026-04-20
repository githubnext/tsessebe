"""Benchmark: any_all — Series.any / all and DataFrame.any / all on 100k rows."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE) % 2 == 0)
df = pd.DataFrame({
    "a": np.arange(SIZE) % 3 != 0,
    "b": np.arange(SIZE) > 0,
    "c": np.ones(SIZE, dtype=bool),
})

for _ in range(WARMUP):
    s.any()
    s.all()
    df.any()
    df.all()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.any()
    s.all()
    df.any()
    df.all()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "any_all",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
