"""Benchmark: format compact (K/M/B) on 100k numbers"""
import json, time

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
data = [i * 1234 for i in range(ROWS)]

def fmt_compact(v):
    if abs(v) >= 1e9: return f"{v/1e9:.1f}B"
    if abs(v) >= 1e6: return f"{v/1e6:.1f}M"
    if abs(v) >= 1e3: return f"{v/1e3:.1f}K"
    return str(v)

for _ in range(WARMUP):
    [fmt_compact(v) for v in data]

start = time.perf_counter()
for _ in range(ITERATIONS):
    [fmt_compact(v) for v in data]
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "format_compact", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
