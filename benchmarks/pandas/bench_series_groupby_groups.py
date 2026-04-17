"""Benchmark: SeriesGroupBy .groups / .ngroups properties on 100k-element Series."""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

categories = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]
data = np.arange(SIZE) * 0.1
by = [categories[i % len(categories)] for i in range(SIZE)]

s = pd.Series(data)
gb = s.groupby(by)

for _ in range(WARMUP):
    _g = gb.groups
    _k = list(gb.groups.keys())
    _n = gb.ngroups

times = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    _g = gb.groups
    _k = list(gb.groups.keys())
    _n = gb.ngroups
    times.append((time.perf_counter() - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({"function": "series_groupby_groups", "mean_ms": mean_ms, "iterations": ITERATIONS, "total_ms": total_ms}))
