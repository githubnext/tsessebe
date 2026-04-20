"""
Benchmark: pandas Series.shift() — shift a 100k-element Series by 1, 3,
and -2 periods. Mirrors tsb's shiftSeries standalone function.
Outputs JSON: {"function": "series_shift_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series([i * 0.5 for i in range(SIZE)])

for _ in range(WARMUP):
    s.shift(1)
    s.shift(3)
    s.shift(-2)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.shift(1)
    s.shift(3)
    s.shift(-2)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "series_shift_fn",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
