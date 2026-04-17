"""Benchmark: Interval.overlaps / IntervalIndex.overlaps — overlap checks on 1k intervals."""
import json, time
import pandas as pd

SIZE = 1_000
WARMUP = 5
ITERATIONS = 50

intervals = [pd.Interval(i, i + 2) for i in range(SIZE)]
breaks = list(range(SIZE + 1))
idx = pd.IntervalIndex.from_breaks(breaks)
query = pd.Interval(250, 750)

for _ in range(WARMUP):
    for iv in intervals[:50]:
        iv.overlaps(query)
    idx.overlaps(query)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for iv in intervals:
        iv.overlaps(query)
    idx.overlaps(query)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "interval_overlaps", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
