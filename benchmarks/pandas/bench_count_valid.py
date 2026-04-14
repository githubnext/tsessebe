"""Benchmark: Series.count on 100k-element pandas Series with NaN"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [np.nan if i % 7 == 0 else i * 0.1 for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.count()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.count()
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "count_valid", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
