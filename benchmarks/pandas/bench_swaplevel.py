import pandas as pd
import numpy as np
import time
import json

N = 50_000
lev_a = [f"a{i % 100}" for i in range(N)]
lev_b = [i % 500 for i in range(N)]
lev_c = [i % 10 for i in range(N)]
idx = pd.MultiIndex.from_arrays([lev_a, lev_b, lev_c])
s = pd.Series(range(N), index=idx)

# Warm-up
for _ in range(3):
    s.swaplevel(0, 1)
    s.reorder_levels([2, 0, 1])

ITERS = 20
start = time.perf_counter()
for _ in range(ITERS):
    s.swaplevel(0, 1)
    s.reorder_levels([2, 0, 1])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "swaplevel",
    "mean_ms": total / ITERS,
    "iterations": ITERS,
    "total_ms": total,
}))
