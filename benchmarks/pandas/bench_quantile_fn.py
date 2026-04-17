"""
Benchmark: quantileSeries / quantileDataFrame equivalent — pandas Series.quantile / DataFrame.quantile.
Outputs JSON: {"function": "quantile_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [(i * 1.41) % 10000 for i in range(ROWS)]
s = pd.Series(data)
df = pd.DataFrame({"a": data, "b": [x * 2 for x in data], "c": [x * 0.5 for x in data]})

for _ in range(WARMUP):
    s.quantile(0.25)
    s.quantile([0.1, 0.5, 0.9])
    df.quantile(0.5)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.quantile(0.25)
    s.quantile([0.1, 0.5, 0.9])
    df.quantile(0.5)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "quantile_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
