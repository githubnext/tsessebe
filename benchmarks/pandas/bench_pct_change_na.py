"""
Benchmark: Series.pct_change() / DataFrame.pct_change() — percent change computations.
Outputs JSON: {"function": "pct_change_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
ROWS = 10_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(100 + np.sin(np.arange(SIZE) / 100))
df = pd.DataFrame({
    "price": 100 + np.arange(ROWS) * 0.01,
    "volume": 1000 + (np.arange(ROWS) % 100) * 10,
    "ratio": 0.5 + np.cos(np.arange(ROWS) / 1000),
})

for _ in range(WARMUP):
    s.pct_change()
    s.pct_change(periods=5)
    df.pct_change()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.pct_change()
    s.pct_change(periods=5)
    df.pct_change()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pct_change_na",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
