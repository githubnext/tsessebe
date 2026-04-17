"""Benchmark: PeriodIndex.shift / sort_values / unique / to_timestamp — PeriodIndex operations on 1k periods."""
import json, time
import pandas as pd
import numpy as np

SIZE = 1_000
WARMUP = 5
ITERATIONS = 50

base = pd.Period("2020-01-01", freq="D")
shuffled = [base + ((i * 7) % SIZE) for i in range(SIZE)]
idx = pd.PeriodIndex(shuffled)

for _ in range(WARMUP):
    idx.shift(30)
    idx.sort_values()
    idx.unique()
    idx.to_timestamp(how="start")
    idx.to_timestamp(how="end")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    idx.shift(30)
    idx.sort_values()
    idx.unique()
    idx.to_timestamp(how="start")
    idx.to_timestamp(how="end")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "period_index_methods", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
