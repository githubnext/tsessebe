"""
Benchmark: Series.nsmallest on 100k-element Series.
Mirrors nsmallestSeries standalone function.
Outputs JSON: {"function": "nsmallest_series_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = np.sin(np.arange(SIZE) * 0.01) * 1000
s = pd.Series(data)

for _ in range(WARMUP):
    s.nsmallest(100)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.nsmallest(100)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "nsmallest_series_fn",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
