"""Benchmark: to_markdown and to_latex on a 1000-row DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 1_000
WARMUP = 3
ITERATIONS = 10

a = np.arange(ROWS) * 1.5
b = [f"item_{i % 50}" for i in range(ROWS)]
c = np.arange(ROWS) % 100
df = pd.DataFrame({"a": a, "b": b, "c": c})

for _ in range(WARMUP):
    df.to_markdown()
    df.to_latex()

start_md = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_markdown()
total_md = (time.perf_counter() - start_md) * 1000

start_ltx = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_latex()
total_ltx = (time.perf_counter() - start_ltx) * 1000

total = total_md + total_ltx

print(json.dumps({
    "function": "to_markdown_latex",
    "mean_ms": total / (ITERATIONS * 2),
    "iterations": ITERATIONS * 2,
    "total_ms": total,
}))
