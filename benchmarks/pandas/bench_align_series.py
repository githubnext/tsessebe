"""
Benchmark: Series.align — align two 50k-element Series on inner/outer/left join.
Outputs JSON: {"function": "align_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 30

idx_a = [i * 2 for i in range(SIZE)]
idx_b = [i * 3 for i in range(SIZE)]
s_a = pd.Series([i * 1.0 for i in range(SIZE)], index=idx_a)
s_b = pd.Series([i * 2.0 for i in range(SIZE)], index=idx_b)

for _ in range(WARMUP):
    s_a.align(s_b, join="inner")
    s_a.align(s_b, join="outer")
    s_a.align(s_b, join="left")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s_a.align(s_b, join="inner")
    s_a.align(s_b, join="outer")
    s_a.align(s_b, join="left")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "align_series",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
