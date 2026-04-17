"""
Benchmark: pandas concat with join="inner" and ignore_index=True options.
Outputs JSON: {"function": "concat_options", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

ROWS = 50_000
WARMUP = 5
ITERATIONS = 20

df1 = pd.DataFrame({
    "a": [i * 1.0 for i in range(ROWS)],
    "b": [i * 2.0 for i in range(ROWS)],
    "c": [i * 3.0 for i in range(ROWS)],
})
df2 = pd.DataFrame({
    "a": [i * 1.5 for i in range(ROWS)],
    "b": [i * 2.5 for i in range(ROWS)],
    "d": [i * 4.0 for i in range(ROWS)],
})

for _ in range(WARMUP):
    pd.concat([df1, df2], join="inner", ignore_index=True)
    pd.concat([df1, df2], join="outer", ignore_index=True)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.concat([df1, df2], join="inner", ignore_index=True)
    pd.concat([df1, df2], join="outer", ignore_index=True)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "concat_options", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
