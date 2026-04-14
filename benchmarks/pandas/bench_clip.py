"""Benchmark: Series.clip() — clip values to a range."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series([float(i) for i in range(SIZE)])

for _ in range(WARMUP):
    s.clip(lower=10000.0, upper=90000.0)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.clip(lower=10000.0, upper=90000.0)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"clip","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
