"""
Benchmark: pandas pct_change on Series and DataFrame.
Outputs JSON: {"function": "pct_change_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [i * 1.1 + 1.0 for i in range(ROWS)]
s = pd.Series(data)
df = pd.DataFrame({"a": data, "b": [x * 2 for x in data]})

for _ in range(WARMUP):
    s.pct_change()
    s.pct_change(periods=2)
    df.pct_change()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.pct_change()
    s.pct_change(periods=2)
    df.pct_change()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "pct_change_fn", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
