"""
Benchmark: DataFrame.any(axis=1) / all(axis=1) — row-wise boolean reductions on 100k-row DataFrame.
Outputs JSON: {"function": "df_any_all_axis1", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

df = pd.DataFrame({
    "a": np.arange(SIZE) % 2 == 0,
    "b": np.arange(SIZE) % 3 != 0,
    "c": np.arange(SIZE) > 0,
    "d": np.arange(SIZE) % 5 == 0,
})

for _ in range(WARMUP):
    df.any(axis=1)
    df.all(axis=1)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.any(axis=1)
    df.all(axis=1)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "df_any_all_axis1",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
