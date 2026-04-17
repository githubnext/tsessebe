"""Benchmark: Timestamp rounding — floor, ceil, round, normalize."""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

timestamps = [
    pd.Timestamp(year=2020, month=(i % 12) + 1, day=(i % 28) + 1,
                 hour=i % 24, minute=(i * 7) % 60, second=(i * 13) % 60)
    for i in range(SIZE)
]

for _ in range(WARMUP):
    for ts in timestamps:
        ts.floor("h")
        ts.ceil("h")
        ts.round("min")
        ts.normalize()

start = time.perf_counter()
for _ in range(ITERATIONS):
    for ts in timestamps:
        ts.floor("h")
        ts.ceil("h")
        ts.round("min")
        ts.normalize()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "timestamp_round_normalize",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
