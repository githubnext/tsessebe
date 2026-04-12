"""Benchmark: read_csv — parse a 100k-row CSV file"""
import json, time, os, tempfile
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 2
ITERATIONS = 5

# Build CSV file
tmp_path = "/tmp/gh-aw/agent/bench_read_csv.csv"
with open(tmp_path, "w") as f:
    f.write("id,value,label\n")
    for i in range(ROWS):
        f.write(f"{i},{i * 1.1:.4f},cat_{i % 50}\n")

for _ in range(WARMUP):
    pd.read_csv(tmp_path)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_csv(tmp_path)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "read_csv",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
