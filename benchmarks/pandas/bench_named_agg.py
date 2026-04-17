"""
Benchmark: DataFrameGroupBy.agg with named aggregations (pandas.NamedAgg) on 100k rows.
Outputs JSON: {"function": "named_agg", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

depts = ["eng", "hr", "sales", "finance", "ops"]
df = pd.DataFrame({
    "dept": [depts[i % len(depts)] for i in range(SIZE)],
    "salary": [50_000 + (i % 100) * 1000 for i in range(SIZE)],
    "headcount": [1 + (i % 5) for i in range(SIZE)],
    "score": [(i % 100) * 0.1 for i in range(SIZE)],
})

gb = df.groupby("dept")

for _ in range(WARMUP):
    gb.agg(
        total_salary=pd.NamedAgg(column="salary", aggfunc="sum"),
        avg_salary=pd.NamedAgg(column="salary", aggfunc="mean"),
        max_salary=pd.NamedAgg(column="salary", aggfunc="max"),
        employees=pd.NamedAgg(column="headcount", aggfunc="count"),
        avg_score=pd.NamedAgg(column="score", aggfunc="mean"),
    )

start = time.perf_counter()
for _ in range(ITERATIONS):
    gb.agg(
        total_salary=pd.NamedAgg(column="salary", aggfunc="sum"),
        avg_salary=pd.NamedAgg(column="salary", aggfunc="mean"),
        max_salary=pd.NamedAgg(column="salary", aggfunc="max"),
        employees=pd.NamedAgg(column="headcount", aggfunc="count"),
        avg_score=pd.NamedAgg(column="score", aggfunc="mean"),
    )
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "named_agg",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
