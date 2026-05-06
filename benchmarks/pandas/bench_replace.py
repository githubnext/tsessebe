"""
Benchmark: Series.replace / DataFrame.replace
Mirrors tsb bench_replace.ts
"""
import json
import time
import pandas as pd
import numpy as np

N = 100_000
WARMUP = 5
ITERS = 20

# Build data matching the TypeScript benchmark
data = [i % 10 for i in range(N)]
series = pd.Series(data)

col1 = [i % 10 for i in range(N)]
col2 = [(i * 3) % 10 for i in range(N)]
df = pd.DataFrame({"a": col1, "b": col2})

# Warm-up
for _ in range(WARMUP):
    series.replace(5, 99)
    df.replace(5, 99)

# Measured: Series.replace scalar
t0 = time.perf_counter()
for i in range(ITERS):
    series.replace(i % 10, 99)
total_series = (time.perf_counter() - t0) * 1000

# Measured: DataFrame.replace scalar
t0 = time.perf_counter()
for i in range(ITERS):
    df.replace(i % 10, 99)
total_df = (time.perf_counter() - t0) * 1000

total_ms = total_series + total_df
mean_ms = total_ms / (ITERS * 2)

print(json.dumps({
    "function": "replace",
    "mean_ms": round(mean_ms, 4),
    "iterations": ITERS * 2,
    "total_ms": round(total_ms, 4),
}))
