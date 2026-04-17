"""
Benchmark: pandas Timestamp static constructors — fromtimestamp, fromisoformat, components.
Outputs JSON: {"function": "timestamp_static", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

import datetime

iso_strings = [
    (datetime.datetime(2020, 1, 1) + datetime.timedelta(days=i)).isoformat()
    for i in range(SIZE)
]
timestamps_s = [
    (datetime.datetime(2020, 1, 1) + datetime.timedelta(hours=i)).timestamp()
    for i in range(SIZE)
]

for _ in range(WARMUP):
    for j in range(SIZE):
        pd.Timestamp(year=2020, month=(j % 12) + 1, day=(j % 28) + 1)
        pd.Timestamp(iso_strings[j % len(iso_strings)])
        pd.Timestamp.fromtimestamp(timestamps_s[j % len(timestamps_s)])

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for j in range(SIZE):
        pd.Timestamp(year=2020, month=(j % 12) + 1, day=(j % 28) + 1)
        pd.Timestamp(iso_strings[j % len(iso_strings)])
        pd.Timestamp.fromtimestamp(timestamps_s[j % len(timestamps_s)])
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "timestamp_static", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
