"""
Benchmark: pandas DataFrame.clip with Series bounds (axis=0) on 100k-row DataFrame.
Outputs JSON: {"function": "clip_dataframe_with_bounds", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": [(i % 200) - 100 for i in range(SIZE)],
    "b": [(i % 150) - 75 for i in range(SIZE)],
    "c": [(i % 100) - 50 for i in range(SIZE)],
})

lower_bounds = pd.Series([(i % 40) - 20 for i in range(SIZE)])
upper_bounds = pd.Series([(i % 40) + 20 for i in range(SIZE)])

for _ in range(WARMUP):
    df.clip(lower=lower_bounds, upper=upper_bounds, axis=0)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.clip(lower=lower_bounds, upper=upper_bounds, axis=0)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "clip_dataframe_with_bounds",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
