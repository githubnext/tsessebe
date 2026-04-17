"""
Benchmark: pandas DataFrame() construction — create 100k-row DataFrame from column arrays.
Mirrors tsb's DataFrame.fromColumns() behavior.
Outputs JSON: {"function": "dataframe_from_columns", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

col_a = np.arange(SIZE, dtype=float)
col_b = np.arange(SIZE, dtype=float) * 2.5
col_c = np.arange(SIZE) % 1000
col_d = np.sin(np.arange(SIZE) * 0.001)

for _ in range(WARMUP):
    pd.DataFrame({"a": col_a, "b": col_b, "c": col_c, "d": col_d})

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.DataFrame({"a": col_a, "b": col_b, "c": col_c, "d": col_d})
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "dataframe_from_columns",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
