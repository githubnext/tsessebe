"""
Benchmark: pandas Timedelta string formatting — format and parse Timedelta objects.
Mirrors tsb formatTimedelta / parseFrac.
Outputs JSON: {"function": "format_timedelta_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 500

tds = [
    pd.Timedelta(0),
    pd.Timedelta(seconds=1),
    pd.Timedelta(days=1),
    pd.Timedelta(hours=1, minutes=1, seconds=1, milliseconds=1),
    pd.Timedelta(hours=-2, milliseconds=-500),
]

for _ in range(WARMUP):
    for td in tds:
        str(td)
    pd.Timedelta(seconds=3600)

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    for td in tds:
        str(td)
    pd.Timedelta(seconds=3600)
total = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "format_timedelta_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
