"""
Benchmark: Series.radd / rsub / rmul / rdiv — reverse arithmetic on 100k-element Series.
Outputs JSON: {"function": "series_radd_rsub", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series((np.arange(SIZE) % 1000) + 1, dtype=float)

for _ in range(WARMUP):
    s.radd(100)
    s.rsub(100)
    s.rmul(2)
    s.rdiv(1000)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.radd(100)
    s.rsub(100)
    s.rmul(2)
    s.rdiv(1000)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_radd_rsub",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
