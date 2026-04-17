"""
Benchmark: pandas DataFrame.pipe with positional target argument on 100k-row DataFrame.
Mirrors tsb's dataFramePipeTo — inserting the DataFrame at a specific arg position.
Outputs JSON: {"function": "dataframe_pipe_to", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50


def filter_above(threshold: float, df: pd.DataFrame) -> pd.DataFrame:
    return df[df["val"] > threshold]


left = pd.DataFrame({
    "key": [i % 1000 for i in range(SIZE)],
    "val": [i * 1.5 for i in range(SIZE)],
})

for _ in range(WARMUP):
    # pandas pipe with tuple form: (fn, 'positional_kwarg') — use pipe with lambda here
    left.pipe(lambda df: filter_above(50_000, df))

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    left.pipe(lambda df: filter_above(50_000, df))
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "dataframe_pipe_to",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
