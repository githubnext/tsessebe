"""
Benchmark: pandas merge with custom suffixes option.
Outputs JSON: {"function": "merge_suffixes", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

ROWS = 50_000
WARMUP = 3
ITERATIONS = 10

ids = [i % 10_000 for i in range(ROWS)]
left = pd.DataFrame({"id": ids, "value": [x * 1.1 for x in ids], "score": [x * 0.5 for x in ids]})
right = pd.DataFrame({
    "id": list(range(10_000)),
    "value": [i * 2.0 for i in range(10_000)],
    "rank": list(range(10_000)),
})

for _ in range(WARMUP):
    pd.merge(left, right, on="id", suffixes=("_left", "_right"))
    pd.merge(left, right, on="id", how="outer", suffixes=("_l", "_r"))

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.merge(left, right, on="id", suffixes=("_left", "_right"))
    pd.merge(left, right, on="id", how="outer", suffixes=("_l", "_r"))
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "merge_suffixes", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
