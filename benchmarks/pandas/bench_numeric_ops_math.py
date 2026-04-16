"""
Benchmark: np.floor / np.ceil / np.trunc / np.sqrt / np.log — math operations on 100k Series.
Outputs JSON: {"function": "numeric_ops_math", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = (np.arange(SIZE) + 1) * 0.1
s = pd.Series(data)

for _ in range(WARMUP):
    np.floor(s)
    np.ceil(s)
    np.trunc(s)
    np.sqrt(s)
    np.log(s)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.floor(s)
    np.ceil(s)
    np.trunc(s)
    np.sqrt(s)
    np.log(s)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "numeric_ops_math",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
