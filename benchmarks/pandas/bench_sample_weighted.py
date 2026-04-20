"""
Benchmark: pandas Series.sample() with weights — weighted random sampling.
Mirrors tsb's sampleSeries with weights option.
Outputs JSON: {"function": "sample_weighted", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 100_000
N_SAMPLE = 1_000
WARMUP = 5
ITERATIONS = 30

data = [i * 0.5 for i in range(SIZE)]
# Weights: higher values get more weight (triangular distribution)
weights = [(i + 1) / SIZE for i in range(SIZE)]

s = pd.Series(data)

for _ in range(WARMUP):
    s.sample(n=N_SAMPLE, weights=weights, replace=False)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.sample(n=N_SAMPLE, weights=weights, replace=False)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "sample_weighted",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
