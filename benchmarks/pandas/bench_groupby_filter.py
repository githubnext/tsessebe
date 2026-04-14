"""Benchmark: GroupBy filter on 100k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
keys = [f"g{i % 200}" for i in range(ROWS)]
vals = [i * 0.1 for i in range(ROWS)]
df = pd.DataFrame({"key": keys, "value": vals})

for _ in range(WARMUP):
    df.groupby("key").filter(lambda x: len(x) > 400)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.groupby("key").filter(lambda x: len(x) > 400)
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "groupby_filter", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
