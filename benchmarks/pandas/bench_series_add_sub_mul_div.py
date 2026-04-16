"""
Benchmark: Series.add / sub / mul / div — standalone arithmetic on 100k-element Series.
Outputs JSON: {"function": "series_add_sub_mul_div", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

a = pd.Series(np.arange(SIZE) * 1.5)
b = pd.Series((np.arange(SIZE) % 1000) + 1)

for _ in range(WARMUP):
    a.add(b)
    a.sub(b)
    a.mul(2)
    a.div(b)

start = time.perf_counter()
for _ in range(ITERATIONS):
    a.add(b)
    a.sub(b)
    a.mul(2)
    a.div(b)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_add_sub_mul_div",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
