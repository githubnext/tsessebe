"""Benchmark: SeriesGroupBy.apply (pandas equivalent)."""
import json
import time
import pandas as pd
import numpy as np

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

data = [i * 0.5 for i in range(ROWS)]
by = [i % 100 for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.groupby(by).apply(lambda g: g)

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    s.groupby(by).apply(lambda g: g - g.mean())
total = (time.perf_counter() - t0) * 1000

print(json.dumps({"function": "series_groupby_apply", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
