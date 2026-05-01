import pandas as pd
import numpy as np
import json
import time

N = 100_000
data = list(range(N))
other_data = [i * 10 if i % 3 == 0 else None for i in range(N)]

s = pd.Series(data, dtype=float)
o = pd.Series(other_data, dtype=float)

# Warm-up
for _ in range(20):
    sc = s.copy()
    sc.update(o)

iterations = 200
start = time.perf_counter()
for _ in range(iterations):
    sc = s.copy()
    sc.update(o)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "update",
    "mean_ms": total_ms / iterations,
    "iterations": iterations,
    "total_ms": total_ms,
}))
