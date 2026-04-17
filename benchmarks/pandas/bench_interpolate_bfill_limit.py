"""
Benchmark: Series.interpolate with bfill method and limit option — backward fill with gap limit on 50k Series.
Outputs JSON: {"function": "interpolate_bfill_limit", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 30

data = np.where(np.arange(SIZE) % 7 < 2, np.nan, np.sin(np.arange(SIZE) * 0.01) * 100)
s = pd.Series(data)

for _ in range(WARMUP):
    s.interpolate(method="bfill")
    s.ffill(limit=2)
    s.bfill(limit=1)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.interpolate(method="bfill")
    s.ffill(limit=2)
    s.bfill(limit=1)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "interpolate_bfill_limit",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
