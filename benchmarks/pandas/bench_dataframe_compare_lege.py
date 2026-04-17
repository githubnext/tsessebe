"""
Benchmark: DataFrame <= and >= element-wise comparisons on 100k-row DataFrame.
Mirrors dataFrameLe / dataFrameGe standalone functions.
Outputs JSON: {"function": "dataframe_compare_lege", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": np.arange(SIZE),
    "b": np.arange(SIZE) * 2,
    "c": np.arange(SIZE) % 100,
})

for _ in range(WARMUP):
    df.le(50)
    df.ge(50)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.le(50)
    df.ge(50)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_compare_lege",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
