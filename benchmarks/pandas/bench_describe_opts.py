"""Benchmark: DataFrame.describe() with percentiles / include options on 100k-row DataFrame."""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame({
    "a": np.arange(SIZE) * 1.5,
    "b": (np.arange(SIZE) % 1000) * 0.7,
    "label": [f"cat_{i % 10}" for i in range(SIZE)],
    "flag": np.arange(SIZE) % 2 == 0,
})

for _ in range(WARMUP):
    df.describe(percentiles=[0.1, 0.25, 0.5, 0.75, 0.9])
    df.describe(include="all")
    df.describe(include=[object])

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.describe(percentiles=[0.1, 0.25, 0.5, 0.75, 0.9])
    df.describe(include="all")
    df.describe(include=[object])
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "describe_opts", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
