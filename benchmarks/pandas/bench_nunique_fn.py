"""
Benchmark: pandas nunique on Series and DataFrame (functional-form equivalent).
Outputs JSON: {"function": "nunique_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

low = pd.Series([i % 1000 for i in range(ROWS)])
high = pd.Series([i % 50_000 for i in range(ROWS)])
with_nulls = pd.Series([float('nan') if i % 100 == 0 else i % 2000 for i in range(ROWS)])
df = pd.DataFrame({"a": low, "b": high, "c": with_nulls})

for _ in range(WARMUP):
    low.nunique()
    with_nulls.nunique(dropna=False)
    df.nunique()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    low.nunique()
    with_nulls.nunique(dropna=False)
    df.nunique()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "nunique_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
