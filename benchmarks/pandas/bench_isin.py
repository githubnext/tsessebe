"""Benchmark: Series.isin() — membership test."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series([i % 5000 for i in range(SIZE)])
test_set = list(range(0, 2500))

for _ in range(WARMUP):
    s.isin(test_set)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.isin(test_set)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"isin","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
