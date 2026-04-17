"""Benchmark: pd.to_numeric scalar coercion — convert individual scalar values to numeric."""
import json, time
import pandas as pd

WARMUP = 5
ITERATIONS = 100
BATCH = 10_000

inputs = []
for i in range(BATCH):
    r = i % 6
    if r == 0:
        inputs.append(str(i * 1.5))
    elif r == 1:
        inputs.append(i)
    elif r == 2:
        inputs.append(f"  {i}  ")
    elif r == 3:
        inputs.append(True)
    elif r == 4:
        inputs.append(None)
    else:
        inputs.append(str(i))

for _ in range(WARMUP):
    for v in inputs:
        pd.to_numeric(v, errors="coerce")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for v in inputs:
        pd.to_numeric(v, errors="coerce")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "to_numeric_scalar", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
