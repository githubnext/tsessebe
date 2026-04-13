"""
Benchmark: DataFrame melt (unpivot)

Creates a wide DataFrame and melts it into long format.
Outputs JSON: {"function": "melt", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 50


def make_frame() -> pd.DataFrame:
    return pd.DataFrame({
        "id": list(range(ROWS)),
        "a": [i * 1.1 for i in range(ROWS)],
        "b": [i * 2.2 for i in range(ROWS)],
        "c": [i * 3.3 for i in range(ROWS)],
    })


df = make_frame()

for _ in range(WARMUP):
    df.melt(id_vars=["id"], value_vars=["a", "b", "c"])

times: "list[float]" = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    df.melt(id_vars=["id"], value_vars=["a", "b", "c"])
    end = time.perf_counter()
    times.append((end - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "melt",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
