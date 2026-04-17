"""
Benchmark: pandas EWM with com and halflife decay parameters.
Outputs JSON: {"function": "ewm_com_halflife", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [float(np.sin(i * 0.05)) for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.ewm(com=9).mean()
    s.ewm(halflife=10).mean()
    s.ewm(com=5).std()
    s.ewm(halflife=7).var()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.ewm(com=9).mean()
    s.ewm(halflife=10).mean()
    s.ewm(com=5).std()
    s.ewm(halflife=7).var()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "ewm_com_halflife", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
