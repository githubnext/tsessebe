"""Benchmark: Series.dot and DataFrame.dot"""
import json, time
import numpy as np
import pandas as pd

N = 1_000
K = 10
WARMUP = 3
ITERATIONS = 10

a = np.arange(N) * 0.1
b = (N - np.arange(N)) * 0.2
sa = pd.Series(a)
sb = pd.Series(b)

# dfA: N rows × K columns (colnames 0..K-1)
# dfB: K rows (index 0..K-1) × K columns
colsA = {str(c): (np.arange(N) + c) * 0.01 for c in range(K)}
dfA = pd.DataFrame(colsA)

colsB = {str(c): [(i * K + c) * 0.1 for i in range(K)] for c in range(K)}
dfB = pd.DataFrame(colsB)

for _ in range(WARMUP):
    sa.dot(sb)
    dfA.dot(dfB)

start = time.perf_counter()
for _ in range(ITERATIONS):
    sa.dot(sb)
    dfA.dot(dfB)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dot_matmul",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
