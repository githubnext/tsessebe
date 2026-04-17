"""
Benchmark: pandas Series.apply() with (value) lambda — 100k-element Series.
Mirrors tsb's applySeries (stats/apply.ts) behavior.
Outputs JSON: {"function": "applySeries_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series([i * 0.5 for i in range(SIZE)])

fn = lambda v: v * 2 + 1  # noqa: E731

for _ in range(WARMUP):
    s.apply(fn)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.apply(fn)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "applySeries_fn",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
