"""
Benchmark: pandas Series.str.split() — split strings by delimiter on 100k strings.
Outputs JSON: {"function": "str_split_method", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

data = [f"part{i % 100}_b{i % 50}_c{i % 25}" for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.split("_")
    s.str.split("_", n=2)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.str.split("_")
    s.str.split("_", n=2)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "str_split_method",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
