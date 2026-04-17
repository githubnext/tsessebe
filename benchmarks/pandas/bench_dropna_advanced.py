"""
Benchmark: DataFrame.dropna with advanced options (thresh, subset, axis=1).
Outputs JSON: {"function": "dropna_advanced", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 30

# DataFrame with scattered null values
rng = np.random.default_rng(42)
df = pd.DataFrame({
    "a": [None if i % 4 == 0 else i * 0.1 for i in range(SIZE)],
    "b": [None if i % 6 == 0 else i * 2.0 for i in range(SIZE)],
    "c": [None if i % 8 == 0 else i % 100 for i in range(SIZE)],
    "d": [None if i % 3 == 0 else f"val_{i % 20}" for i in range(SIZE)],
})

for _ in range(WARMUP):
    df.dropna(thresh=3)
    df.dropna(subset=["a", "b"])
    df.dropna(axis=1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.dropna(thresh=3)
    df.dropna(subset=["a", "b"])
    df.dropna(axis=1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "dropna_advanced", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
