"""
Benchmark: pandas Series.interpolate() / DataFrame.interpolate() — fill NaN by interpolation.
Outputs JSON: {"function": "interpolate_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 50_000
WARMUP = 5
ITERATIONS = 20

series_data = [float("nan") if i % 10 == 0 else i * 1.0 for i in range(SIZE)]
s = pd.Series(series_data)

df = pd.DataFrame({
    "a": [float("nan") if i % 7 == 0 else i * 0.5 for i in range(SIZE)],
    "b": [float("nan") if i % 11 == 0 else np.sin(i * 0.01) * 100 for i in range(SIZE)],
})

for _ in range(WARMUP):
    s.interpolate(method="linear")
    s.interpolate(method="pad")
    df.interpolate()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.interpolate(method="linear")
    s.interpolate(method="pad")
    df.interpolate()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "interpolate_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
