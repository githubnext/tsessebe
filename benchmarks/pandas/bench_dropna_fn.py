"""
Benchmark: pandas Series.dropna() / DataFrame.dropna() — drop missing values.
Outputs JSON: {"function": "dropna_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

series_data = [float("nan") if i % 5 == 0 else i * 1.0 for i in range(SIZE)]
s = pd.Series(series_data)

df = pd.DataFrame({
    "a": [float("nan") if i % 5 == 0 else i * 0.1 for i in range(SIZE)],
    "b": [float("nan") if i % 7 == 0 else i * 2.0 for i in range(SIZE)],
    "c": [float("nan") if i % 3 == 0 else i % 100 for i in range(SIZE)],
})

for _ in range(WARMUP):
    s.dropna()
    df.dropna()
    df.dropna(how="any")
    df.dropna(how="all")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.dropna()
    df.dropna()
    df.dropna(how="any")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "dropna_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
