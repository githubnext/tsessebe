"""
Benchmark: pandas Series.clip with per-element Series bounds on 100k values.
Outputs JSON: {"function": "clip_series_with_bounds", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

data = [(i % 200) - 100 for i in range(SIZE)]
lower = pd.Series([(i % 50) - 30 for i in range(SIZE)])
upper = pd.Series([(i % 50) + 20 for i in range(SIZE)])
series = pd.Series(data)

for _ in range(WARMUP):
    series.clip(lower=lower, upper=upper)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    series.clip(lower=lower, upper=upper)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "clip_series_with_bounds",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
