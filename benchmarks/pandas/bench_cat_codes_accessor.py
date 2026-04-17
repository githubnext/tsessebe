"""
Benchmark: pd.Categorical.codes / categories / ordered — category accessor properties
on a 100k-element categorical Series.
Outputs JSON: {"function": "cat_codes_accessor", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
CATS = 50
WARMUP = 5
ITERATIONS = 30

categories = [f"cat_{i}" for i in range(CATS)]
data = [categories[i % CATS] for i in range(SIZE)]
s = pd.Categorical(data, categories=categories)
ps = pd.Series(s)

for _ in range(WARMUP):
    _ = ps.cat.codes
    _ = ps.cat.categories
    _ = ps.cat.ordered
    _ = len(ps.cat.categories)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    _ = ps.cat.codes
    _ = ps.cat.categories
    _ = ps.cat.ordered
    _ = len(ps.cat.categories)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "cat_codes_accessor",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
