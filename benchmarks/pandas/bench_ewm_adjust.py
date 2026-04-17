"""
Benchmark: EWM with adjust=False — IIR-based exponential weighted mean vs default adjust=True on 100k Series.
Outputs JSON: {"function": "ewm_adjust", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

data = np.sin(np.arange(SIZE) * 0.01) * 100
s = pd.Series(data)

for _ in range(WARMUP):
    s.ewm(alpha=0.3, adjust=False).mean()
    s.ewm(alpha=0.3, adjust=True).mean()
    s.ewm(span=20, adjust=False).mean()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.ewm(alpha=0.3, adjust=False).mean()
    s.ewm(alpha=0.3, adjust=True).mean()
    s.ewm(span=20, adjust=False).mean()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "ewm_adjust",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
