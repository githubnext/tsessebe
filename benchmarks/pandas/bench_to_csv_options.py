"""
Benchmark: pandas DataFrame.to_csv() with options — sep, header, index settings.
Outputs JSON: {"function": "to_csv_options", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame({
    "id": np.arange(ROWS),
    "value": np.arange(ROWS) * 1.1,
    "label": [f"cat_{i % 50}" for i in range(ROWS)],
})

for _ in range(WARMUP):
    df.to_csv(sep="\t")
    df.to_csv(header=False)
    df.to_csv(index=False)
    df.to_csv(sep="|", header=False, index=False)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.to_csv(sep="\t")
    df.to_csv(header=False)
    df.to_csv(index=False)
    df.to_csv(sep="|", header=False, index=False)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "to_csv_options",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
