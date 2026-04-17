"""
Benchmark: pandas Series.diff() + DataFrame.applymap() — diff and element-wise map.
Outputs JSON: {"function": "diff_applymap_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series([i * 1.0 + np.sin(i * 0.01) for i in range(SIZE)])

df = pd.DataFrame({
    "a": [i * 0.1 for i in range(SIZE)],
    "b": [i * 0.2 + 1 for i in range(SIZE)],
    "c": [i * -0.1 for i in range(SIZE)],
})

for _ in range(WARMUP):
    s.diff()
    s.diff(2)
    df.map(lambda v: v ** 2)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.diff()
    s.diff(2)
    df.map(lambda v: v ** 2)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "diff_applymap_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
