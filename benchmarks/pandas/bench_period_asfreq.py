"""
Benchmark: pandas Period.asfreq and PeriodIndex.asfreq — frequency conversion.
Outputs JSON: {"function": "period_asfreq", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 3
ITERATIONS = 20

idx = pd.period_range(start="2000-01", periods=SIZE, freq="M")

for _ in range(WARMUP):
    idx.asfreq("D", how="start")
    idx.asfreq("D", how="end")
    idx.asfreq("Q", how="start")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    idx.asfreq("D", how="start")
    idx.asfreq("D", how="end")
    idx.asfreq("Q", how="start")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "period_asfreq", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
