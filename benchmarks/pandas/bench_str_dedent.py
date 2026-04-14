"""Benchmark: textwrap.dedent on 50k multi-line strings"""
import json, time
import textwrap

N = 50_000
WARMUP = 3
ITERATIONS = 10
data = [f"  line1 {i}\n  line2 {i}\n  line3 {i}" for i in range(N)]

for _ in range(WARMUP):
    [textwrap.dedent(s) for s in data]

start = time.perf_counter()
for _ in range(ITERATIONS):
    [textwrap.dedent(s) for s in data]
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_dedent", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
