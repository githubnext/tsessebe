"""Benchmark: pandas DataFrame from dict of Series (equivalent to dataFrameFromPairs)"""
import json, time
import pandas as pd

N = 10_000
pairs = {
    "a": pd.Series(range(N)),
    "b": pd.Series(range(0, N * 2, 2)),
    "c": pd.Series(range(0, N * 3, 3)),
}

WARMUP = 3
ITERATIONS = 100

for _ in range(WARMUP):
    pd.DataFrame(pairs)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.DataFrame(pairs)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "df_from_pairs", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
