"""Benchmark: move column (reindex) on a 100k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
df = pd.DataFrame({"a": range(ROWS), "b": [i*2 for i in range(ROWS)], "c": [i*3 for i in range(ROWS)]})

for _ in range(WARMUP):
    cols = ["c"] + [c for c in df.columns if c != "c"]
    df[cols]

start = time.perf_counter()
for _ in range(ITERATIONS):
    cols = ["c"] + [c for c in df.columns if c != "c"]
    df[cols]
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "move_column", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
