"""
Benchmark: pandas Expanding with min_periods option.
Outputs JSON: {"function": "expanding_min_periods", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [float('nan') if i % 10 == 0 else float(np.sin(i * 0.01)) for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.expanding(min_periods=10).mean()
    s.expanding(min_periods=50).sum()
    s.expanding(min_periods=5).std()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.expanding(min_periods=10).mean()
    s.expanding(min_periods=50).sum()
    s.expanding(min_periods=5).std()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "expanding_min_periods", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
