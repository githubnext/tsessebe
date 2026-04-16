"""
Benchmark: DataFrame.shift / DataFrame.diff — shift and diff on a 50k-row DataFrame.
Outputs JSON: {"function": "dataframe_shift_diff", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

rng = np.random.default_rng(42)
df = pd.DataFrame({
    "a": np.arange(SIZE) * 1.5,
    "b": np.sin(np.arange(SIZE) * 0.01) * 100,
    "c": np.arange(SIZE) % 200,
})

for _ in range(WARMUP):
    df.shift(1)
    df.diff(1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.shift(1)
    df.diff(1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_shift_diff",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
