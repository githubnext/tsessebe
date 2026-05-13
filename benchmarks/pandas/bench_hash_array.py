import pandas as pd
import time
import json

N = 100_000
arr = [None if i % 10 == 0 else f"str_{i}" if i % 3 == 0 else i for i in range(N)]

# Warm-up
for _ in range(5):
    pd.util.hash_array(arr)

ITERS = 20
start = time.perf_counter()
for _ in range(ITERS):
    pd.util.hash_array(arr)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "hash_array",
    "mean_ms": total / ITERS,
    "iterations": ITERS,
    "total_ms": total,
}))
