"""
Benchmark: pandas.array() — create and iterate typed arrays.
Outputs JSON: {"function": "pd_array", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 10_000
WARMUP = 5
ITERATIONS = 100

int_data = list(range(SIZE))
float_data = [i * 0.5 for i in range(SIZE)]
string_data = [f"item_{i % 100}" for i in range(SIZE)]
mixed_data = [None if i % 3 == 0 else i for i in range(SIZE)]


def run():
    a = pd.array(int_data, dtype="Int64")
    b = pd.array(float_data, dtype="Float64")
    c = pd.array(string_data, dtype="string")
    d = pd.array(mixed_data, dtype="Int64")

    # Access elements
    _ = a[-1]
    _ = b[0]
    _ = len(c)
    _ = d[0]


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "pd_array",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
