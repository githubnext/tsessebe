"""
Benchmark: pandas Index.map(fn) — transform Index values with a mapping function.
Outputs JSON: {"function": "index_map", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

num_idx = pd.Index(range(SIZE))
str_idx = pd.Index([f"key_{i % 1000}" for i in range(SIZE)])

for _ in range(WARMUP):
    num_idx.map(lambda v: v * 2)
    str_idx.map(lambda v: v.upper())

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    num_idx.map(lambda v: v * 2)
    str_idx.map(lambda v: v.upper())
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "index_map",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
