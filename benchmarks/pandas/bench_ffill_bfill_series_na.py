"""
Benchmark: Series.ffill() / bfill() — forward/backward fill on 100k-element Series.
Outputs JSON: {"function": "ffill_bfill_series_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = np.arange(SIZE, dtype=float) * 1.5
data[::10] = np.nan
s = pd.Series(data)

for _ in range(WARMUP):
    s.ffill()
    s.bfill()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.ffill()
    s.bfill()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "ffill_bfill_series_na",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
