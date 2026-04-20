"""Benchmark: series_reflected_arith — Series.radd / rsub / rmul / rdiv."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

a = pd.Series(np.arange(SIZE) * 1.5)
b = pd.Series((np.arange(SIZE) % 1000) + 1.0)

for _ in range(WARMUP):
    a.radd(10)
    a.rsub(1000)
    a.rmul(3)
    b.rdiv(100)

start = time.perf_counter()
for _ in range(ITERATIONS):
    a.radd(10)
    a.rsub(1000)
    a.rmul(3)
    b.rdiv(100)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_reflected_arith",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
