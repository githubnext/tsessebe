"""Benchmark: pd.TimedeltaIndex construction from timedeltas/range/strings."""
import json
import time
import numpy as np
import pandas as pd

SIZE = 1_000
WARMUP = 5
ITERATIONS = 100

deltas = [pd.Timedelta(days=i, hours=i % 24) for i in range(SIZE)]
start_td = pd.Timedelta(days=0)
stop_td = pd.Timedelta(days=SIZE)
step_td = pd.Timedelta(days=1)
strings = [f"{i}D" for i in range(SIZE)]

for _ in range(WARMUP):
    pd.TimedeltaIndex(deltas)
    pd.timedelta_range(start=start_td, end=stop_td, freq=step_td)
    pd.to_timedelta(strings)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.TimedeltaIndex(deltas)
    pd.timedelta_range(start=start_td, end=stop_td, freq=step_td)
    pd.to_timedelta(strings)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "timedelta_index", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
