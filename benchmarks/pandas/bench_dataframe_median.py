"""
Benchmark: pandas DataFrame.median() — column-wise median on a 100k-row DataFrame.
Outputs JSON: {"function": "dataframe_median", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": (np.arange(SIZE) * 1.23) % 9000,
    "b": (np.arange(SIZE) * 4.56) % 7000,
    "c": (np.arange(SIZE) * 7.89) % 5000,
})

for _ in range(WARMUP):
    df.median()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.median()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "dataframe_median",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
