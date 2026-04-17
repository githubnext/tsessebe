"""
Benchmark: pandas SeriesGroupBy — all aggregation operations (sum/mean/std/min/max/count/first/last) on 100k Series.
Outputs JSON: {"function": "series_groupby_agg_all", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 10

s = pd.Series((np.arange(SIZE) * 1.5) % 9999)
by = pd.Series(np.arange(SIZE) % 100)
gb = s.groupby(by)

for _ in range(WARMUP):
    gb.sum()
    gb.mean()
    gb.std()
    gb.min()
    gb.max()
    gb.count()
    gb.first()
    gb.last()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    gb.sum()
    gb.mean()
    gb.std()
    gb.min()
    gb.max()
    gb.count()
    gb.first()
    gb.last()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "series_groupby_agg_all",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
