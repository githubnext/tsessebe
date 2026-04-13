"""
Benchmark: DataFrame to_csv

Serializes a large DataFrame to a CSV string.
Outputs JSON: {"function": "to_csv", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time
import io

import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "id": list(range(ROWS)),
    "x": [i * 1.1 for i in range(ROWS)],
    "y": [i * 2.2 for i in range(ROWS)],
    "label": [f"item_{i % 100}" for i in range(ROWS)],
})

for _ in range(WARMUP):
    df.to_csv(index=False)

times: "list[float]" = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    df.to_csv(index=False)
    end = time.perf_counter()
    times.append((end - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "to_csv",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
