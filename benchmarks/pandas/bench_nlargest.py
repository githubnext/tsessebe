"""
Benchmark: Series nlargest

Returns the N largest values from a large numeric Series.
Outputs JSON: {"function": "nlargest", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas as pd

SIZE = 100_000
N = 100
WARMUP = 5
ITERATIONS = 50

data = [(i * 7919) % SIZE for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.nlargest(N)

times: "list[float]" = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    s.nlargest(N)
    end = time.perf_counter()
    times.append((end - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "nlargest",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
