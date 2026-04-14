"""Benchmark: textwrap.indent on 50k multi-line strings"""
import json, time
import textwrap

N = 50_000
WARMUP = 3
ITERATIONS = 10
data = [f"line1 {i}\nline2 {i}\nline3 {i}" for i in range(N)]

for _ in range(WARMUP):
    [textwrap.indent(s, "  ") for s in data]

start = time.perf_counter()
for _ in range(ITERATIONS):
    [textwrap.indent(s, "  ") for s in data]
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_indent", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
