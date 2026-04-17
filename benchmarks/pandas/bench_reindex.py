"""
Benchmark: Series.reindex / DataFrame.reindex — realign to a new index.
Outputs JSON: {"function": "reindex", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

orig_labels = np.arange(SIZE) * 2  # 0, 2, 4, ..., 2*(SIZE-1)
data = np.arange(SIZE) * 1.5
s = pd.Series(data, index=orig_labels)
new_index = np.arange(SIZE + 1000)  # 0..SIZE+999

df = pd.DataFrame({"a": data, "b": data * 2}, index=orig_labels)

for _ in range(WARMUP):
    s.reindex(new_index)
    df.reindex(new_index)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.reindex(new_index)
    df.reindex(new_index)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "reindex",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
