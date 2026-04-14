"""Benchmark: format thousands separator on 100k numbers"""
import json, time

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [i * 1234.56 for i in range(ROWS)]

for _ in range(WARMUP):
    [f"{v:,.2f}" for v in data]

start = time.perf_counter()
for _ in range(ITERATIONS):
    [f"{v:,.2f}" for v in data]
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "format_thousands", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
