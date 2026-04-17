"""Benchmark: DataFrame.isin — test membership of each element against value sets."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": [i % 20 for i in range(SIZE)],
    "b": [["x", "y", "z", "w"][i % 4] for i in range(SIZE)],
    "c": [i % 10 for i in range(SIZE)],
})

global_values = [0, 1, 2, "x", "y"]
col_values = {"a": [0, 1, 2, 3, 4], "b": ["x", "y"], "c": [0, 5]}

for _ in range(WARMUP):
    df.isin(global_values)
    df.isin(col_values)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.isin(global_values)
    df.isin(col_values)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "dataframe_isin_fn", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
