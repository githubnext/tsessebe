"""Benchmark: Series.interpolate() — linear interpolation over NaN values."""
import json, time
import pandas as pd
import math

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = [float(i) if i % 5 != 0 else math.nan for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.interpolate(method="linear")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.interpolate(method="linear")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"interpolate","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
