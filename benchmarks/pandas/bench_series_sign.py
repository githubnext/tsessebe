"""Benchmark: seriesSign — element-wise sign via numpy.sign on 100k-element Series."""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = np.sin(np.arange(SIZE) * 0.01) * 1000
s = pd.Series(data)

for _ in range(WARMUP):
    np.sign(s)

times = []
for _ in range(ITERATIONS):
    start = time.perf_counter()
    np.sign(s)
    times.append((time.perf_counter() - start) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS

print(json.dumps({"function": "series_sign", "mean_ms": mean_ms, "iterations": ITERATIONS, "total_ms": total_ms}))
