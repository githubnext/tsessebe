"""Benchmark: DataFrame column presence and access (.keys(), [], __getitem__) on 100k-row DataFrame."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 10
ITERATIONS = 100

df = pd.DataFrame({"a": list(range(SIZE)), "b": [i * 2.0 for i in range(SIZE)], "c": [str(i) for i in range(SIZE)]})

for _ in range(WARMUP):
    "a" in df.columns
    df["b"]
    df.get("c")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    "a" in df.columns
    df["b"]
    df.get("c")
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({"function": "dataframe_has_col_get", "mean_ms": round(total / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total, 3)}))
