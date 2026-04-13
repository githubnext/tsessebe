"""
Benchmark: Pearson correlation

Computes the Pearson correlation coefficient between two large numeric Series.
Outputs JSON: {"function": "pearson_corr", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

x = pd.Series([i * 1.1 + 0.5 for i in range(SIZE)])
y = pd.Series([i * 0.9 - 0.3 for i in range(SIZE)])

for _ in range(WARMUP):
    x.corr(y, method="pearson")

times: "list[float]" = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    x.corr(y, method="pearson")
    end = time.perf_counter()
    times.append((end - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "pearson_corr",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
