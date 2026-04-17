"""Benchmark: Series.replace — replace values in a Series."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series([i % 10 for i in range(SIZE)])
mapping = {0: 100, 1: 200, 2: 300, 3: 400, 4: 500}

for _ in range(WARMUP):
    s.replace(mapping)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.replace(mapping)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "replace_series", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
