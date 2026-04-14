"""Benchmark: DataFrame.std() and DataFrame.var() on 100k-row DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

df = pd.DataFrame({
    "a": (np.arange(ROWS) * 1.23) % 9000,
    "b": (np.arange(ROWS) * 4.56) % 7000,
})
for _ in range(WARMUP): df.std(); df.var()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.std()
    df.var()
    times.append(time.perf_counter() - t0)
total = sum(times) * 1000
print(json.dumps({ "function": "dataframe_std_var", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total }))
