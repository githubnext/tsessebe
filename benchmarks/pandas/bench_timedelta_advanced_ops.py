"""
Benchmark: pandas Timedelta advanced operations — parse, isoformat, division, negation, multiplication, comparison.
Outputs JSON: {"function": "timedelta_advanced_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 1_000
WARMUP = 5
ITERATIONS = 100

iso_strings = [
    "1 days 02:30:00",
    "0 days 00:45:00",
    "7 days 00:00:00",
    "-1 days +22:30:00",
    "10 days 05:20:15",
]

td1 = pd.Timedelta(days=2, hours=3)
td2 = pd.Timedelta(hours=5, minutes=30)
deltas = [pd.Timedelta(days=i % 365, hours=i % 24) for i in range(SIZE)]

for _ in range(WARMUP):
    for s in iso_strings:
        pd.Timedelta(s)
    for td in deltas[:50]:
        td.isoformat()
        td / td1 if td1.total_seconds() != 0 else None
        -td
        td * 2
        td < td2
        td == td1

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for s in iso_strings:
        pd.Timedelta(s)
    for td in deltas:
        td.isoformat()
        -td
        td * 3
        td < td2
        td == td1
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "timedelta_advanced_ops",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
