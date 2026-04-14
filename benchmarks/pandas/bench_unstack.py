"""Benchmark: DataFrame.unstack() — pivot innermost index level to columns."""
import json, time
import pandas as pd

ROWS = 500
COLS = 10
WARMUP = 5
ITERATIONS = 50

import numpy as np
idx = pd.MultiIndex.from_product([range(ROWS), range(COLS)], names=["row","col"])
s = pd.Series([float(i) for i in range(ROWS * COLS)], index=idx)

for _ in range(WARMUP):
    s.unstack()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.unstack()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"unstack","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
