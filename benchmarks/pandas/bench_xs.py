import pandas as pd
import json
import time

N = 100_000
index = [str(i) for i in range(N)]
df = pd.DataFrame({"a": range(N), "b": [i * 2 for i in range(N)]}, index=index)

# Warm-up
for i in range(100):
    df.xs("500")

iterations = 10_000
start = time.perf_counter()
for i in range(iterations):
    df.xs(str(i % N))
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "xs",
    "mean_ms": total_ms / iterations,
    "iterations": iterations,
    "total_ms": total_ms,
}))
