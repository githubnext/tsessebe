"""Benchmark: DataFrameGroupBy .groups / .ngroups properties on 100k-row DataFrame."""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

depts = ["eng", "hr", "sales", "finance", "ops", "legal", "mkt", "it", "rd", "ops2"]
df = pd.DataFrame({
    "dept": [depts[i % len(depts)] for i in range(SIZE)],
    "salary": [50_000 + (i % 100) * 1000 for i in range(SIZE)],
    "score": [(i % 100) * 0.01 for i in range(SIZE)],
})

gb = df.groupby("dept")

for _ in range(WARMUP):
    _g = gb.groups
    _k = list(gb.groups.keys())
    _n = gb.ngroups

times = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    _g = gb.groups
    _k = list(gb.groups.keys())
    _n = gb.ngroups
    times.append((time.perf_counter() - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({"function": "groupby_groups_props", "mean_ms": mean_ms, "iterations": ITERATIONS, "total_ms": total_ms}))
