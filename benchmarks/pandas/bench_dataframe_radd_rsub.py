"""
Benchmark: DataFrame.radd / rsub / rmul / rdiv — reverse arithmetic on 100k-row DataFrame.
Outputs JSON: {"function": "dataframe_radd_rsub", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "x": (np.arange(SIZE) % 1000 + 1).astype(float),
    "y": (np.arange(SIZE) % 500 + 0.5),
})

for _ in range(WARMUP):
    df.radd(100)
    df.rsub(100)
    df.rmul(2)
    df.rdiv(1000)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.radd(100)
    df.rsub(100)
    df.rmul(2)
    df.rdiv(1000)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_radd_rsub",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
