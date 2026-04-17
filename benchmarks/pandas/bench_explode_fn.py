"""
Benchmark: pandas Series.explode() / DataFrame.explode() — expand list-like elements.
Outputs JSON: {"function": "explode_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 10_000
WARMUP = 5
ITERATIONS = 20

series_data = [list(range(i * 10 + j for j in range((i % 4) + 2))) for i in range(ROWS)]
series_data = [[i * 10 + j for j in range((i % 4) + 2)] for i in range(ROWS)]
s = pd.Series(series_data)

df = pd.DataFrame({
    "a": [[i + j for j in range((i % 3) + 1)] for i in range(ROWS)],
    "b": [f"key_{i % 100}" for i in range(ROWS)],
})

for _ in range(WARMUP):
    s.explode()
    df.explode("a")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.explode()
    df.explode("a")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "explode_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
