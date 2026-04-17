"""
Benchmark: Series.map(np.exp) / log2 / log10 / sign — extended math on 100k-element Series.
Outputs JSON: {"function": "series_exp_log", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series((np.arange(SIZE) % 1000 + 1).astype(float))

for _ in range(WARMUP):
    np.exp(s)
    np.log2(s)
    np.log10(s)
    np.sign(s)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.exp(s)
    np.log2(s)
    np.log10(s)
    np.sign(s)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_exp_log",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
