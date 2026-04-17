"""
Benchmark: pandas DataFrame.rolling().min() / .max() — rolling min/max aggregations.
Outputs JSON: {"function": "dataframe_rolling_min_max", "mean_ms": ..., "iterations": ..., "total_ms": ...}
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
    df.rolling(WINDOW).min()
    df.rolling(WINDOW).max()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.rolling(WINDOW).min()
    df.rolling(WINDOW).max()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "dataframe_rolling_min_max",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
