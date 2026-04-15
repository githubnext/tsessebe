"""Benchmark: pandas Index.symmetric_difference on 10k-element integer indexes"""
import json, time
import pandas as pd

N = 10_000
a = pd.Index(range(N))
b = pd.Index(range(N // 2, N + N // 2))

WARMUP = 3
ITERATIONS = 50

for _ in range(WARMUP):
    a.symmetric_difference(b)

start = time.perf_counter()
for _ in range(ITERATIONS):
    a.symmetric_difference(b)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "index_symmetric_diff", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
