"""Benchmark: Series.map() with a dictionary lookup."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series([i % 1000 for i in range(SIZE)])
lookup = {i: float(i * 2.5) for i in range(1000)}

for _ in range(WARMUP):
    s.map(lookup)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.map(lookup)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"series_map","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
