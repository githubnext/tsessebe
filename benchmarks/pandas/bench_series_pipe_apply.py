"""
Benchmark: Series.pipe / DataFrame.pipe — pipe function application utilities.
Outputs JSON: {"function": "series_pipe_apply", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE) * 0.5 - SIZE * 0.25)
df = pd.DataFrame({
    "a": np.arange(SIZE) * 0.5,
    "b": np.arange(SIZE) * 0.3 + 1,
})

def abs_and_double(x):
    return x.abs() * 2

for _ in range(WARMUP):
    s.pipe(abs_and_double)
    df.pipe(abs_and_double)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.pipe(abs_and_double)
    df.pipe(abs_and_double)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_pipe_apply",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
