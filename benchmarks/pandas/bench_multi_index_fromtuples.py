"""
Benchmark: pandas MultiIndex.from_tuples — construct MultiIndex from array of tuples.
Outputs JSON: {"function": "multi_index_fromtuples", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 5_000
WARMUP = 3
ITERATIONS = 20

tuples2 = [(f"dept_{i % 20}", i % 100) for i in range(SIZE)]
tuples3 = [(f"region_{i % 5}", f"dept_{i % 20}", i % 50) for i in range(SIZE)]

for _ in range(WARMUP):
    pd.MultiIndex.from_tuples(tuples2)
    pd.MultiIndex.from_tuples(tuples3)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.MultiIndex.from_tuples(tuples2)
    pd.MultiIndex.from_tuples(tuples3)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "multi_index_fromtuples",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
