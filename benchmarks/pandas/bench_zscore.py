"""
Benchmark: Series zscore (z-score normalization)

Computes the z-score of a large numeric Series.
Outputs JSON: {"function": "zscore", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = [i * 1.1 + 0.5 for i in range(SIZE)]
s = pd.Series(data)

def zscore(series: pd.Series) -> pd.Series:
    return (series - series.mean()) / series.std(ddof=1)

for _ in range(WARMUP):
    zscore(s)

times: "list[float]" = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    zscore(s)
    end = time.perf_counter()
    times.append((end - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "zscore",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
