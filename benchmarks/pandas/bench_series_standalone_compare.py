"""
Benchmark: standalone Series comparison operators (eq, ne, lt, gt, le, ge) on 100k Series.
Mirrors seriesEq/Ne/Lt/Gt/Le/Ge standalone functions.
Outputs JSON: {"function": "series_standalone_compare", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = np.arange(SIZE) * 0.1
s = pd.Series(data)
threshold = SIZE * 0.05

for _ in range(WARMUP):
    s.eq(threshold)
    s.ne(threshold)
    s.lt(threshold)
    s.gt(threshold)
    s.le(threshold)
    s.ge(threshold)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.eq(threshold)
    s.ne(threshold)
    s.lt(threshold)
    s.gt(threshold)
    s.le(threshold)
    s.ge(threshold)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_standalone_compare",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
