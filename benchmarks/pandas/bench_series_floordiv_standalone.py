"""
Benchmark: Series floordiv / mod / pow standalone functions on 100k Series.
Mirrors seriesFloorDiv / seriesMod / seriesPow.
Outputs JSON: {"function": "series_floordiv_standalone", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = (np.arange(SIZE) % 1000) + 1
s = pd.Series(data.astype(float))

for _ in range(WARMUP):
    s.floordiv(3)
    s.mod(7)
    s.pow(2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.floordiv(3)
    s.mod(7)
    s.pow(2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_floordiv_standalone",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
