"""Benchmark: str_swapcase_capitalize — str.swapcase and str.capitalize on 100k strings."""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"Hello World {i % 500} EXAMPLE" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.swapcase()
    s.str.capitalize()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.swapcase()
    s.str.capitalize()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_swapcase_capitalize",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
