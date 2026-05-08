"""
Benchmark: Series.cumsum / cumprod / cummax / cummin / DataFrame.cumsum
Mirrors tsb bench_cum_ops.ts
"""
import json
import time
import pandas as pd

N = 100_000
WARMUP = 5
ITERS = 20

# Matching data
data = [(i % 100) + 1 for i in range(N)]
series = pd.Series(data, dtype=float)

col1 = [(i % 100) + 1 for i in range(N)]
col2 = [((i * 3) % 100) + 1 for i in range(N)]
df = pd.DataFrame({"a": col1, "b": col2}, dtype=float)

# Warm-up
for _ in range(WARMUP):
    series.cumsum()
    series.cummax()
    df.cumsum()

# Measured: cumsum
t0 = time.perf_counter()
for _ in range(ITERS):
    series.cumsum()
total_cumsum = (time.perf_counter() - t0) * 1000

# Measured: cumprod
t0 = time.perf_counter()
for _ in range(ITERS):
    series.cumprod()
total_cumprod = (time.perf_counter() - t0) * 1000

# Measured: cummax
t0 = time.perf_counter()
for _ in range(ITERS):
    series.cummax()
total_cummax = (time.perf_counter() - t0) * 1000

# Measured: cummin
t0 = time.perf_counter()
for _ in range(ITERS):
    series.cummin()
total_cummin = (time.perf_counter() - t0) * 1000

# Measured: DataFrame.cumsum
t0 = time.perf_counter()
for _ in range(ITERS):
    df.cumsum()
total_df = (time.perf_counter() - t0) * 1000

total_ms = total_cumsum + total_cumprod + total_cummax + total_cummin + total_df
mean_ms = total_ms / (ITERS * 5)

print(json.dumps({
    "function": "cum_ops",
    "mean_ms": round(mean_ms, 4),
    "iterations": ITERS * 5,
    "total_ms": round(total_ms, 4),
}))
