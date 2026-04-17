"""
Benchmark: pandas DataFrame.items() / DataFrame.iterrows() — column and row iteration.
Outputs JSON: {"function": "dataframe_iter", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": [i * 1.0 for i in range(ROWS)],
    "b": [i * 2.0 for i in range(ROWS)],
    "c": [i * 3.0 for i in range(ROWS)],
})


def consume_items(df: pd.DataFrame) -> None:
    for _, s in df.items():
        _ = s.sum()


def consume_iterrows(df: pd.DataFrame) -> None:
    count = 0
    for _ in df.iterrows():
        count += 1


for _ in range(WARMUP):
    consume_items(df)
    consume_iterrows(df)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    consume_items(df)
    consume_iterrows(df)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "dataframe_iter", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
