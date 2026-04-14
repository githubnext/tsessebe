"""Benchmark: Series.where() — conditional replacement."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series([float(i) for i in range(SIZE)])
cond = s > 50000.0

for _ in range(WARMUP):
    s.where(cond, other=0.0)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.where(cond, other=0.0)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"where","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
