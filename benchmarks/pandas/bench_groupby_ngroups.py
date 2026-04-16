"""Benchmark: DataFrameGroupBy.ngroups and .groups property access."""
import json
import time
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "key": [f"g{i % 100}" for i in range(ROWS)],
    "val": [i * 1.5 for i in range(ROWS)],
})
gbk = df.groupby("key")

for _ in range(WARMUP):
    gbk.ngroups
    list(gbk.groups.keys())

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    gbk.ngroups
    list(gbk.groups.keys())
total = (time.perf_counter() - t0) * 1000

print(json.dumps({"function": "groupby_ngroups", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
