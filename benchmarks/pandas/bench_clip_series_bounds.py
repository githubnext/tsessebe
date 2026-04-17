"""
Benchmark: Series.clip(lower=, upper=) / DataFrame.clip(lower=, upper=) — element-wise clip bounds.
Outputs JSON: {"function": "clip_series_bounds", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = np.arange(SIZE) - SIZE / 2
s = pd.Series(data)
lower_s = pd.Series(np.full(SIZE, -10000.0))
upper_s = pd.Series(np.full(SIZE, 10000.0))

df = pd.DataFrame({
    "a": np.arange(SIZE) - SIZE / 2,
    "b": np.sin(np.arange(SIZE) * 0.01) * 100,
})
lower_df = pd.DataFrame({"a": np.full(SIZE, -10000.0), "b": np.full(SIZE, -50.0)})
upper_df = pd.DataFrame({"a": np.full(SIZE, 10000.0), "b": np.full(SIZE, 50.0)})

for _ in range(WARMUP):
    s.clip(lower=lower_s, upper=upper_s)
    df.clip(lower=lower_df, upper=upper_df)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.clip(lower=lower_s, upper=upper_s)
    df.clip(lower=lower_df, upper=upper_df)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "clip_series_bounds",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
