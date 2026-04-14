"""
Benchmark: DataFrame read_json

Parses a JSON string into a DataFrame (records orient).
Outputs JSON: {"function": "read_json", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time
import io

import pandas as pd

ROWS = 5_000
WARMUP = 5
ITERATIONS = 50

records = [
    {"id": i, "x": i * 1.1, "y": i * 2.2, "label": f"item_{i % 100}"}
    for i in range(ROWS)
]
json_str = json.dumps(records)

for _ in range(WARMUP):
    pd.read_json(io.StringIO(json_str))

times: "list[float]" = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    pd.read_json(io.StringIO(json_str))
    end = time.perf_counter()
    times.append((end - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "read_json",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
