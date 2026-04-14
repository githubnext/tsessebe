"""Benchmark: DataFrame.corr — pairwise correlation of numeric columns."""
import json, time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({"a":[float(i*1.1) for i in range(SIZE)],"b":[float(i*0.7+0.3) for i in range(SIZE)],"c":[float(i*-0.5+100) for i in range(SIZE)]})

for _ in range(WARMUP):
    df.corr()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.corr()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"corr","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
