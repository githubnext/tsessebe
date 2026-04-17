"""
Benchmark: Series.value_counts(bins=N) — bin 100k values and count occurrences.
Outputs JSON: {"function": "value_counts_binned", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = [(i % 1000) * 0.1 for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.value_counts(bins=10)
    s.value_counts(bins=50)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.value_counts(bins=10)
    s.value_counts(bins=50)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "value_counts_binned",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
