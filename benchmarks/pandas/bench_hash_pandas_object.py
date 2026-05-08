import pandas as pd
import numpy as np
import json
import time

N = 10_000
nums = list(range(N))
strs = [f"label_{i}" for i in range(N)]

num_series = pd.Series(nums, dtype=float)
df = pd.DataFrame({"a": nums, "b": strs})

# Warm-up
for _ in range(10):
    pd.util.hash_pandas_object(num_series)
    pd.util.hash_pandas_object(df)

iterations = 50
start = time.perf_counter()
for _ in range(iterations):
    pd.util.hash_pandas_object(num_series)
    pd.util.hash_pandas_object(df)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "hash_pandas_object",
    "mean_ms": total_ms / iterations,
    "iterations": iterations,
    "total_ms": total_ms,
}))
