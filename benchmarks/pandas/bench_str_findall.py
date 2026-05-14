"""
Benchmark: str.findall, str.extract (first match), str.count on 10k-element string Series
"""
import json
import time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

data = [f"item{i} code{i * 3} ref{i + 1}" for i in range(ROWS)]
s = pd.Series(data)
pat = r"\d+"

for _ in range(WARMUP):
    s.str.findall(pat)
    s.str.extract(r"(\d+)", expand=False)
    s.str.count(pat)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.findall(pat)
    s.str.extract(r"(\d+)", expand=False)
    s.str.count(pat)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_findall",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
