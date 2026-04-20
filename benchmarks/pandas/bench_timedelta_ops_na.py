"""
Benchmark: pd.Timedelta parsing / formatting — timedelta ops.
Outputs JSON: {"function": "timedelta_ops_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 100

td = pd.Timedelta(hours=1, minutes=1, seconds=1)
vals = ["1h", "30min", "2.5s", "100ms", "1D 2h"]

for _ in range(WARMUP):
    for v in vals:
        pd.Timedelta(v)
    str(td)

start = time.perf_counter()
for _ in range(ITERATIONS):
    for v in vals:
        pd.Timedelta(v)
    str(td)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "timedelta_ops_na",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
