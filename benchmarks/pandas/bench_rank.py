"""
Benchmark: Series rank

Ranks a large numeric Series using average tie-breaking.
Outputs JSON: {"function": "rank", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = [float((i // 3) * 1.5) for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.rank(method="average")

times: "list[float]" = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    s.rank(method="average")
    end = time.perf_counter()
    times.append((end - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "rank",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
