"""Benchmark: isnull / notnull — aliases for isna / notna on Series and DataFrame."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series([np.nan if i % 7 == 0 else i * 0.1 for i in range(SIZE)])
df = pd.DataFrame({
    "a": [np.nan if i % 5 == 0 else float(i) for i in range(SIZE)],
    "b": [np.nan if i % 3 == 0 else i * 2.5 for i in range(SIZE)],
})

for _ in range(WARMUP):
    pd.isnull(s)
    pd.notnull(s)
    pd.isnull(df)
    pd.notnull(df)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.isnull(s)
    pd.notnull(s)
    pd.isnull(df)
    pd.notnull(df)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "isnull_notnull", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
