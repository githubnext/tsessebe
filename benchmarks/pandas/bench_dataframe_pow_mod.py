"""
Benchmark: DataFrame ** / % / // — power, modulo, floor division on DataFrame.
Outputs JSON: {"function": "dataframe_pow_mod", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": (np.arange(SIZE) % 10) + 1,
    "b": (np.arange(SIZE) % 7) + 1,
    "c": (np.arange(SIZE) % 5) + 1,
})

for _ in range(WARMUP):
    df.pow(2)
    df.mod(3)
    df.floordiv(2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.pow(2)
    df.mod(3)
    df.floordiv(2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_pow_mod",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
