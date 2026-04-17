"""
Benchmark: pandas sample on Series and DataFrame.
Outputs JSON: {"function": "sample_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

data = [i * 1.5 for i in range(ROWS)]
s = pd.Series(data)
df = pd.DataFrame({"a": data, "b": [x * 2 for x in data], "c": [x + 100 for x in data]})

for _ in range(WARMUP):
    s.sample(n=1000)
    s.sample(frac=0.01)
    df.sample(n=500)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.sample(n=1000)
    s.sample(frac=0.01)
    df.sample(n=500)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "sample_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
