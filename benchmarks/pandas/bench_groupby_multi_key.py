"""
Benchmark: pandas DataFrame groupby with multiple key columns.
Outputs JSON: {"function": "groupby_multi_key", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

depts = ["eng", "sales", "hr", "ops"]
regions = ["north", "south", "east", "west"]
dept = [depts[i % len(depts)] for i in range(ROWS)]
region = [regions[i % len(regions)] for i in range(ROWS)]
value = [i * 0.5 for i in range(ROWS)]
bonus = [i * 0.1 for i in range(ROWS)]

df = pd.DataFrame({"dept": dept, "region": region, "value": value, "bonus": bonus})

for _ in range(WARMUP):
    df.groupby(["dept", "region"]).sum()
    df.groupby(["dept", "region"]).mean()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.groupby(["dept", "region"]).sum()
    df.groupby(["dept", "region"]).mean()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "groupby_multi_key", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
