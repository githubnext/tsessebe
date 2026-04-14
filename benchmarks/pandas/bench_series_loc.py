"""Benchmark: Series.loc[] — label-based selection on 100k Series."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series(np.arange(SIZE) * 2.0, index=np.arange(SIZE))
select_labels = np.arange(0, SIZE, 100)
for _ in range(WARMUP): s.loc[select_labels]

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.loc[select_labels]
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "series_loc", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
