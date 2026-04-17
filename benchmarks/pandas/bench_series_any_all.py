"""
Benchmark: Series.any() / all() — boolean reductions on 100k-element Series.
Outputs JSON: {"function": "series_any_all", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE) % 2 == 0)

for _ in range(WARMUP):
    s.any()
    s.all()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.any()
    s.all()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_any_all",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
