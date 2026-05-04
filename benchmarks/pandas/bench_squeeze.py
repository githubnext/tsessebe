import pandas as pd
import numpy as np
import json
import time

N = 100_000
data = list(range(N))

# For Series.squeeze: multi-element returns self unchanged
big_series = pd.Series(data, dtype=float)
# For DataFrame.squeeze(axis=1): single-column DataFrame
single_col_df = pd.DataFrame({"a": data})

# Warm-up
for _ in range(20):
    big_series.squeeze()
    single_col_df.squeeze(axis=1)

iterations = 500
start = time.perf_counter()
for _ in range(iterations):
    big_series.squeeze()
    single_col_df.squeeze(axis=1)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "squeeze",
    "mean_ms": total_ms / iterations,
    "iterations": iterations,
    "total_ms": total_ms,
}))
