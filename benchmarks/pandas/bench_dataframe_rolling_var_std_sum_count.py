"""
Benchmark: pandas DataFrame.rolling().var() / std() / sum() / count() — rolling aggregations.
Outputs JSON: {"function": "dataframe_rolling_var_std_sum_count", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 50_000
WINDOW = 20
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": np.sin(np.arange(SIZE) * 0.01) * 100,
    "b": np.cos(np.arange(SIZE) * 0.01) * 50,
    "c": (np.arange(SIZE) % 100) * 1.5,
})

for _ in range(WARMUP):
    df.rolling(WINDOW).var()
    df.rolling(WINDOW).std()
    df.rolling(WINDOW).sum()
    df.rolling(WINDOW).count()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.rolling(WINDOW).var()
    df.rolling(WINDOW).std()
    df.rolling(WINDOW).sum()
    df.rolling(WINDOW).count()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "dataframe_rolling_var_std_sum_count",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
