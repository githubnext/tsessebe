"""Benchmark: SeriesGroupBy.filter (pandas equivalent)."""
import json
import time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

data = [i * 1.0 for i in range(ROWS)]
by = [i % 100 for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.groupby(by).filter(lambda g: g.sum() > 1000)

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    s.groupby(by).filter(lambda g: g.sum() > 1000)
total = (time.perf_counter() - t0) * 1000

print(json.dumps({"function": "series_groupby_filter", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
