"""
Benchmark: pandas DataFrame.apply() — apply fn to each column (axis=0) and row (axis=1).
Mirrors tsb's dataFrameApply (stats/apply.ts) behavior.
Outputs JSON: {"function": "dataframe_apply_stats", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 10_000
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame({
    "a": (np.arange(SIZE) * 1.0),
    "b": (np.arange(SIZE) * 2.0),
    "c": (np.arange(SIZE) * 3.0),
})

sum_fn = lambda col: col.mean()  # noqa: E731

for _ in range(WARMUP):
    df.apply(sum_fn, axis=0)
    df.apply(sum_fn, axis=1)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.apply(sum_fn, axis=0)
    df.apply(sum_fn, axis=1)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "dataframe_apply_stats",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
