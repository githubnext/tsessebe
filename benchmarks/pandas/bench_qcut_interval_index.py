"""
Benchmark: pandas qcut with IntervalIndex output on 100k values.
Outputs JSON: {"function": "qcut_interval_index", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

data = (np.arange(SIZE) * 1.1) % 1000

for _ in range(WARMUP):
    pd.qcut(data, q=10, duplicates="drop", retbins=True)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.qcut(data, q=10, duplicates="drop", retbins=True)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "qcut_interval_index",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
