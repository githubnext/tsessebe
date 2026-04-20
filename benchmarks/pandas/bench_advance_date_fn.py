"""
Benchmark: pandas DateOffset arithmetic — date frequency parsing and advancement.
Mirrors tsb advanceDate / parseFreq.
Outputs JSON: {"function": "advance_date_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 1000

d = pd.Timestamp("2023-06-15")
offsets = [
    pd.DateOffset(days=1),
    pd.DateOffset(days=3),
    pd.offsets.BDay(1),
    pd.offsets.Week(1),
    pd.offsets.MonthBegin(1),
    pd.offsets.MonthEnd(1),
    pd.DateOffset(hours=1),
    pd.DateOffset(hours=2),
    pd.DateOffset(minutes=1),
    pd.offsets.YearBegin(1),
]

for _ in range(WARMUP):
    for off in offsets:
        d + off
    pd.Timestamp("2023-01-01")
    pd.Timestamp(1672531200000, unit="ms")

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    for off in offsets:
        d + off
    pd.Timestamp("2023-01-01")
    pd.Timestamp(1672531200000, unit="ms")
total = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "advance_date_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
