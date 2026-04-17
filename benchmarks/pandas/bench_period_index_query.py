"""
Benchmark: pandas PeriodIndex.get_loc / isin — querying a PeriodIndex.
Outputs JSON: {"function": "period_index_query", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 1_000
WARMUP = 5
ITERATIONS = 100

base = pd.Period("2020-01", freq="M")
periods = [base + i for i in range(SIZE)]
idx = pd.PeriodIndex(periods)

query_period = base + 500
mid_period = base + 250

for _ in range(WARMUP):
    idx.get_loc(query_period)
    query_period in idx
    idx.get_loc(mid_period)
    mid_period in idx

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    idx.get_loc(query_period)
    query_period in idx
    idx.get_loc(mid_period)
    mid_period in idx
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "period_index_query",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
