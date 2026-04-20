"""
Benchmark: Series.any() / all() / DataFrame.any() / all() — boolean reductions.
Outputs JSON: {"function": "any_all_reduce_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
ROWS = 10_000
WARMUP = 5
ITERATIONS = 100

bool_data = np.arange(SIZE) % 3 != 0
s = pd.Series(bool_data)
df = pd.DataFrame({
    "a": np.arange(ROWS) % 2 == 0,
    "b": np.arange(ROWS) > ROWS // 2,
    "c": np.ones(ROWS, dtype=bool),
})

for _ in range(WARMUP):
    s.any()
    s.all()
    df.any()
    df.all()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.any()
    s.all()
    df.any()
    df.all()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "any_all_reduce_na",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
