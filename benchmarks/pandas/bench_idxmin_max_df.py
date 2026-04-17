"""
Benchmark: pandas DataFrame.idxmin() / DataFrame.idxmax() — index of min/max per column.
Outputs JSON: {"function": "idxmin_max_df", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": [np.sin(i * 0.001) * 100 for i in range(ROWS)],
    "b": [float("nan") if i % 100 == 0 else i * 0.1 for i in range(ROWS)],
    "c": [i * 1.0 if i % 2 == 0 else -i * 1.0 for i in range(ROWS)],
})

for _ in range(WARMUP):
    df.idxmin()
    df.idxmax()
    df.idxmin(skipna=False)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.idxmin()
    df.idxmax()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "idxmin_max_df", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
