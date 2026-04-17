"""Benchmark: Series.var() — variance on 100k numeric Series."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 10
ITERATIONS = 100

s = pd.Series([i * 0.5 for i in range(SIZE)])

for _ in range(WARMUP): s.var()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.var()
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({"function": "series_var_method", "mean_ms": round(total / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total, 3)}))
