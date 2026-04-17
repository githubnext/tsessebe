"""
Benchmark: pandas DataFrame.where() / DataFrame.mask() — conditional replacement.
Outputs JSON: {"function": "where_mask_df_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

df = pd.DataFrame({
    "a": [i * 1.0 for i in range(ROWS)],
    "b": [float("nan") if i % 2 == 0 else i * 0.5 for i in range(ROWS)],
    "c": [i * -1.0 for i in range(ROWS)],
})

cond = df > 0

for _ in range(WARMUP):
    df.where(cond, other=0)
    df.mask(cond, other=-1)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.where(cond, other=0)
    df.mask(cond, other=-1)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "where_mask_df_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
