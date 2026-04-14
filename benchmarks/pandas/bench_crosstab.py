"""Benchmark: pd.crosstab() — compute a cross-tabulation."""
import json, time
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

import random
random.seed(42)
a = pd.Series([random.choice(["x","y","z"]) for _ in range(SIZE)])
b = pd.Series([random.choice(["p","q","r","s"]) for _ in range(SIZE)])

for _ in range(WARMUP):
    pd.crosstab(a, b)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.crosstab(a, b)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"crosstab","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
