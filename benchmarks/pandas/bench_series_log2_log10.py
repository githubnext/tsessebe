"""
Benchmark: pandas Series/DataFrame log2 / log10 on 100k values.
Outputs JSON: {"function": "series_log2_log10", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

data = (np.arange(1, SIZE + 1) * 0.01)
s = pd.Series(data)
df = pd.DataFrame({
    "a": data,
    "b": np.arange(1, SIZE + 1) * 0.02,
    "c": np.arange(1, SIZE + 1) * 0.03,
})

for _ in range(WARMUP):
    np.log2(s)
    np.log10(s)
    np.log2(df)
    np.log10(df)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    np.log2(s)
    np.log10(s)
    np.log2(df)
    np.log10(df)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "series_log2_log10",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
