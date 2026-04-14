"""Benchmark: DataFrame.loc[] on 100k-row DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 30

idx = np.arange(ROWS)
df = pd.DataFrame({"a": np.arange(ROWS) * 1.0, "b": np.arange(ROWS) * 2.0}, index=idx)
select_labels = np.arange(0, ROWS, 100)
for _ in range(WARMUP): df.loc[select_labels]

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.loc[select_labels]
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "dataframe_loc", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
