"""Benchmark: Period.add / diff / compareTo / contains — Period arithmetic on 1k periods."""
import json, time
import pandas as pd

SIZE = 1_000
WARMUP = 5
ITERATIONS = 50

base = pd.Period("2020-01-01", freq="D")
periods = [base + i for i in range(SIZE)]
other = base + 500

for _ in range(WARMUP):
    for p in periods[:50]:
        p + 10
        p - other
        p < other
        p.start_time

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for p in periods:
        p + 10
        p - other
        p < other
        p.start_time
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "period_arithmetic", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
