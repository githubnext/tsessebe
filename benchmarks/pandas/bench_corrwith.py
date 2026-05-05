"""Benchmark: autoCorr and corrWith on 10k-element Series"""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

rng = np.random.default_rng(42)
data = np.sin(np.arange(ROWS) * 0.05) * 50 + rng.random(ROWS) * 10
s = pd.Series(data)
s2 = pd.Series(np.cos(np.arange(ROWS) * 0.05) * 30 + rng.random(ROWS) * 5)

for _ in range(WARMUP):
    s.autocorr(lag=1)
    s.corr(s2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.autocorr(lag=1)
    s.corr(s2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "corrwith",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
