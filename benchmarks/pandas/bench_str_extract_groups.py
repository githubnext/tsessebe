\"\"\"Benchmark: str.extract on 10k-element string Series\"\"\"
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
data = [f"user_{i}_score_{i % 100}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.extract(r"user_(\d+)_score_(\d+)")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.extract(r"user_(\d+)_score_(\d+)")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_extract_groups", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
