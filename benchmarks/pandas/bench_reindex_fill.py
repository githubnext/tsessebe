"""
Benchmark: pandas Series.reindex() with ffill / bfill fill methods.
Mirrors tsb's reindexSeries with method="ffill"/"bfill".
Outputs JSON: {"function": "reindex_fill", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 50_000
WARMUP = 5
ITERATIONS = 30

# Sparse original index: every other position
orig_index = [i * 2 for i in range(SIZE)]
data = [np.sin(i * 0.01) for i in range(SIZE)]
s = pd.Series(data, index=orig_index)

# Dense new index: fills in the gaps
new_index = list(range(SIZE * 2))

for _ in range(WARMUP):
    s.reindex(new_index, method="ffill")
    s.reindex(new_index, method="bfill")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.reindex(new_index, method="ffill")
    s.reindex(new_index, method="bfill")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "reindex_fill",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
