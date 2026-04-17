"""
Benchmark: Series ceil / floor / trunc / sqrt — math rounding on 100k-element Series.
Outputs JSON: {"function": "series_ceil_floor_trunc_sqrt", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series((np.arange(SIZE) % 1000) * 0.7 + 0.3)

for _ in range(WARMUP):
    np.ceil(s)
    np.floor(s)
    np.trunc(s)
    np.sqrt(s)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.ceil(s)
    np.floor(s)
    np.trunc(s)
    np.sqrt(s)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_ceil_floor_trunc_sqrt",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
