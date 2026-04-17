"""
Benchmark: pandas.get_dummies with prefix, drop_first, dummy_na options.
Outputs JSON: {"function": "get_dummies_opts", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 30

categories = ["apple", "banana", "cherry", "date", "elderberry"]
data = [None if i % 20 == 0 else categories[i % len(categories)] for i in range(SIZE)]
s = pd.Series(data, dtype="object")

df = pd.DataFrame({
    "fruit": [None if i % 20 == 0 else categories[i % len(categories)] for i in range(SIZE)],
    "color": [["red", "green", "blue"][i % 3] for i in range(SIZE)],
})

for _ in range(WARMUP):
    pd.get_dummies(s, prefix="cat", dummy_na=True)
    pd.get_dummies(s, drop_first=True)
    pd.get_dummies(df, columns=["fruit", "color"], prefix="col", drop_first=True)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.get_dummies(s, prefix="cat", dummy_na=True)
    pd.get_dummies(s, drop_first=True)
    pd.get_dummies(df, columns=["fruit", "color"], prefix="col", drop_first=True)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "get_dummies_opts", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
