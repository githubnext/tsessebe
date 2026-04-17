"""Benchmark: TimedeltaIndex sort / unique / shift / min / max on 1k-element index."""
import json, time
import pandas as pd
import numpy as np

SIZE = 1_000
WARMUP = 5
ITERATIONS = 100

deltas = [pd.Timedelta(days=(i * 13) % 365, hours=i % 24) for i in range(SIZE)]
idx = pd.TimedeltaIndex(deltas)
shift_by = pd.Timedelta(days=1)
threshold = pd.Timedelta(days=100)

for _ in range(WARMUP):
    idx.sort_values()
    idx.unique()
    idx + shift_by
    idx[idx < threshold]
    idx.min()
    idx.max()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    idx.sort_values()
    idx.unique()
    idx + shift_by
    idx[idx < threshold]
    idx.min()
    idx.max()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "timedelta_index_ops", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
