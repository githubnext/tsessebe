"""
Benchmark: pandas DataFrame.rolling(10).median() / DataFrame.expanding(1).median() — rolling and expanding median on DataFrame.
Outputs JSON: {"function": "dataframe_rolling_median", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame({
    "a": [i * 0.1 for i in range(ROWS)],
    "b": [(i * 0.3) % 500 for i in range(ROWS)],
})

for _ in range(WARMUP):
    df.rolling(10).median()
    df.expanding(1).median()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.rolling(10).median()
    df.expanding(1).median()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "dataframe_rolling_median",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
