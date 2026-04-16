"""
Benchmark: DataFrame.any() / all() — boolean reductions on 100k-row DataFrame.
Outputs JSON: {"function": "dataframe_any_all", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": np.arange(SIZE) % 2 == 0,
    "b": np.arange(SIZE) % 3 != 0,
    "c": np.arange(SIZE) > 0,
})

for _ in range(WARMUP):
    df.any()
    df.all()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.any()
    df.all()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_any_all",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
