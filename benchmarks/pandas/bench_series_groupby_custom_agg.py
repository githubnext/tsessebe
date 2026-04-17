"""Benchmark: SeriesGroupBy.agg with custom aggregate functions — median, range.
Mirrors tsb bench_series_groupby_custom_agg.ts.
"""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

data = [(i * 1.5) % 9999 for i in range(SIZE)]
by = [i % 100 for i in range(SIZE)]
s = pd.Series(data)
gb = s.groupby(by)

def median_fn(x):
    return float(np.median(x))

def range_fn(x):
    return float(np.max(x) - np.min(x))

for _ in range(WARMUP):
    gb.agg(median_fn)
    gb.agg(range_fn)

start = time.perf_counter()
for _ in range(ITERATIONS):
    gb.agg(median_fn)
    gb.agg(range_fn)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_groupby_custom_agg",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
