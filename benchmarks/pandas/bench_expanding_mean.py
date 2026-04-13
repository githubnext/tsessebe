"""
Benchmark: Expanding mean

Computes the expanding mean of a large numeric Series.
Outputs JSON: {"function": "expanding_mean", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

data = [i * 1.1 + 0.5 for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.expanding().mean()

times: "list[float]" = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    s.expanding().mean()
    end = time.perf_counter()
    times.append((end - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "expanding_mean",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
