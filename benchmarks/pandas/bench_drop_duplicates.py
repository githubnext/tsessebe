"""Benchmark: DataFrame.drop_duplicates() — remove duplicate rows."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({"a":[i % 1000 for i in range(SIZE)],"b":[i % 500 for i in range(SIZE)]})

for _ in range(WARMUP):
    df.drop_duplicates()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.drop_duplicates()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"drop_duplicates","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
