"""Benchmark: merge with left_on/right_on (pandas equivalent)."""
import json
import time
import pandas as pd

ROWS = 20_000
WARMUP = 3
ITERATIONS = 10

left = pd.DataFrame({
    "emp_id": list(range(ROWS)),
    "salary": [30000 + i * 10 for i in range(ROWS)],
})
right = pd.DataFrame({
    "id": list(range(ROWS // 2)),
    "dept": [f"dept{i % 10}" for i in range(ROWS // 2)],
})

for _ in range(WARMUP):
    pd.merge(left, right, left_on="emp_id", right_on="id")

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    pd.merge(left, right, left_on="emp_id", right_on="id")
total = (time.perf_counter() - t0) * 1000

print(json.dumps({"function": "merge_left_on_right_on", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
