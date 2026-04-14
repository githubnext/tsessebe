"""Benchmark: format scientific notation on 100k numbers"""
import json, time

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [i * 1.23456e-5 for i in range(ROWS)]

for _ in range(WARMUP):
    [f"{v:.2e}" for v in data]

start = time.perf_counter()
for _ in range(ITERATIONS):
    [f"{v:.2e}" for v in data]
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "format_scientific", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
