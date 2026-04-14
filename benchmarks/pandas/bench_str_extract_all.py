\"\"\"Benchmark: str.extractall on 10k-element string Series\"\"\"
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
data = [f"val{i} num{i*2} extra{i}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.extractall(r"(\d+)")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.extractall(r"(\d+)")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "str_extract_all", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
