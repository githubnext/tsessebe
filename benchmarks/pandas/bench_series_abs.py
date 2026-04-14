"""Benchmark: Series.abs() — element-wise absolute value."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series([float(i - 50000) for i in range(SIZE)])

for _ in range(WARMUP):
    s.abs()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.abs()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"series_abs","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
