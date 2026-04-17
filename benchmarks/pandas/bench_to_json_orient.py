"""Benchmark: DataFrame.to_json() with different orient options on 10k-row DataFrame."""
import json, time
import pandas as pd
import numpy as np

SIZE = 10_000
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame({
    "id": np.arange(SIZE),
    "value": np.arange(SIZE) * 1.1,
    "label": [f"cat_{i % 10}" for i in range(SIZE)],
})

for _ in range(WARMUP):
    df.to_json(orient="records")
    df.to_json(orient="split")
    df.to_json(orient="columns")
    df.to_json(orient="values")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.to_json(orient="records")
    df.to_json(orient="split")
    df.to_json(orient="columns")
    df.to_json(orient="values")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "to_json_orient", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
