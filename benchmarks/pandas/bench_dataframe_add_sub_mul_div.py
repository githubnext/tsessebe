"""
Benchmark: DataFrame.add / sub / mul / div — standalone arithmetic on 50k-row DataFrame.
Outputs JSON: {"function": "dataframe_add_sub_mul_div", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": np.arange(SIZE) * 1.5,
    "b": np.arange(SIZE) * 2.0,
    "c": (np.arange(SIZE) % 100) + 1,
})

for _ in range(WARMUP):
    df.add(10)
    df.sub(5)
    df.mul(2)
    df.div(3)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.add(10)
    df.sub(5)
    df.mul(2)
    df.div(3)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_add_sub_mul_div",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
