"""Benchmark: GroupBy custom agg on 100k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
keys = [f"g{i % 100}" for i in range(ROWS)]
vals = [i * 0.1 for i in range(ROWS)]
df = pd.DataFrame({"key": keys, "value": vals})

for _ in range(WARMUP):
    df.groupby("key")["value"].agg(lambda x: x.max() - x.min())

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.groupby("key")["value"].agg(lambda x: x.max() - x.min())
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "groupby_custom_agg", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
