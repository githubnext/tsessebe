"""
Benchmark: DataFrame.nunique(axis=1) — count unique values per row on a 10k-row DataFrame.
Outputs JSON: {"function": "df_nunique_axis1", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": np.arange(SIZE) % 5,
    "b": np.arange(SIZE) % 10,
    "c": np.arange(SIZE) % 3,
    "d": np.arange(SIZE) % 7,
    "e": np.arange(SIZE) % 4,
})

for _ in range(WARMUP):
    df.nunique(axis=1)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.nunique(axis=1)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "df_nunique_axis1",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
