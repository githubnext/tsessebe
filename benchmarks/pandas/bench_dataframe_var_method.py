"""Benchmark: DataFrame.var() — column-wise variance on 100k-row DataFrame."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 10
ITERATIONS = 100

df = pd.DataFrame({"a": [i * 1.1 for i in range(SIZE)], "b": [i * 2.2 for i in range(SIZE)], "c": [i * 3.3 for i in range(SIZE)]})

for _ in range(WARMUP): df.var()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.var()
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({"function": "dataframe_var_method", "mean_ms": round(total / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total, 3)}))
