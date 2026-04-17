"""Benchmark: cutIntervalIndex / qcutIntervalIndex — pd.cut/qcut returning IntervalIndex on 100k-element Series."""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

data = (np.arange(SIZE) % 1000) * 0.1
s = pd.Series(data)

for _ in range(WARMUP):
    pd.cut(s, 20, retbins=False)
    pd.qcut(s, 10, duplicates="drop")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.cut(s, 20, retbins=False)
    pd.qcut(s, 10, duplicates="drop")
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "cut_interval_index", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
