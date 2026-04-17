"""
Benchmark: pandas DataFrame.mode() — column-wise mode.
Outputs JSON: {"function": "mode_dataframe_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 10_000
WARMUP = 5
ITERATIONS = 20

df = pd.DataFrame({
    "a": [i % 10 for i in range(ROWS)],
    "b": [float("nan") if i % 50 == 0 else i % 5 for i in range(ROWS)],
    "c": [i % 3 for i in range(ROWS)],
})

for _ in range(WARMUP):
    df.mode()
    df.mode(dropna=False)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.mode()
    df.mode(dropna=False)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "mode_dataframe_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
