"""Benchmark: DataFrame.assign — add new columns using the pandas assign API."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": [i * 1.0 for i in range(SIZE)],
    "b": [i * 2.0 for i in range(SIZE)],
})

for _ in range(WARMUP):
    df.assign(
        c=[i * 3.0 for i in range(SIZE)],
        d=lambda working: working["a"] + working["c"],
    )

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.assign(
        c=[i * 3.0 for i in range(SIZE)],
        d=lambda working: working["a"] + working["c"],
    )
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "dataframe_assign_fn", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
