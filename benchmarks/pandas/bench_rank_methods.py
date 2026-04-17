"""
Benchmark: Series.rank with different tie-breaking methods (min/max/first/dense).
Outputs JSON: {"function": "rank_methods", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

# Data with many ties to stress different tie-breaking methods
data = [float((i // 5) * 1.0) for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.rank(method="min")
    s.rank(method="max")
    s.rank(method="first")
    s.rank(method="dense")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.rank(method="min")
    s.rank(method="max")
    s.rank(method="first")
    s.rank(method="dense")
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "rank_methods", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
