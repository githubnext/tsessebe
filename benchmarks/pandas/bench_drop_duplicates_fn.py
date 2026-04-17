"""
Benchmark: Series.drop_duplicates / DataFrame.drop_duplicates on 100k elements.
Mirrors dropDuplicatesSeries / dropDuplicatesDataFrame standalone functions.
Outputs JSON: {"function": "drop_duplicates_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE) % 1000)
df = pd.DataFrame({
    "a": np.arange(SIZE) % 1000,
    "b": np.arange(SIZE) % 500,
})

for _ in range(WARMUP):
    s.drop_duplicates()
    df.drop_duplicates()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.drop_duplicates()
    df.drop_duplicates()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "drop_duplicates_fn",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
