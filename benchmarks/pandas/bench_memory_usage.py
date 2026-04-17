"""
Benchmark: Series.memory_usage / DataFrame.memory_usage — memory estimation.
Outputs JSON: {"function": "memory_usage", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

num_series = pd.Series([i * 1.0 for i in range(SIZE)])
str_series = pd.Series([f"label_{i % 100}" for i in range(SIZE)])
df = pd.DataFrame({
    "a": [i * 1.0 for i in range(SIZE)],
    "b": [i * 2.0 for i in range(SIZE)],
    "c": [f"cat_{i % 50}" for i in range(SIZE)],
    "d": [i % 2 == 0 for i in range(SIZE)],
})

for _ in range(WARMUP):
    num_series.memory_usage()
    str_series.memory_usage(deep=True)
    df.memory_usage()
    df.memory_usage(deep=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    num_series.memory_usage()
    str_series.memory_usage(deep=True)
    df.memory_usage()
    df.memory_usage(deep=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "memory_usage",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
