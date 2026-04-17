"""Benchmark: TimedeltaIndex.astype(str), .to_numpy(), element access, rename
on 10k-element TimedeltaIndex."""
import pandas as pd
import numpy as np
import json
import time

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

deltas = pd.to_timedelta(
    [(i % 365) * 24 * 3600 + (i % 24) * 3600 + (i % 60) * 60 for i in range(SIZE)],
    unit="s",
)
idx = pd.TimedeltaIndex(deltas, name="duration")

for _ in range(WARMUP):
    idx.astype(str)
    idx.to_numpy()
    idx[0]
    idx[-1]
    idx.rename("elapsed")

start = time.perf_counter()
for _ in range(ITERATIONS):
    idx.astype(str)
    idx.to_numpy()
    idx[0]
    idx[-1]
    idx.rename("elapsed")
total = time.perf_counter() - start

print(json.dumps({
    "function": "timedelta_index_tostrings",
    "mean_ms": total / ITERATIONS * 1000,
    "iterations": ITERATIONS,
    "total_ms": total * 1000,
}))
