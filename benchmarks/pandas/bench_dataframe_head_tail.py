"""Benchmark: DataFrame.head() and .tail() — slice first/last N rows."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({"a":[float(i) for i in range(SIZE)],"b":[i*2 for i in range(SIZE)],"c":[str(i) for i in range(SIZE)]})

for _ in range(WARMUP):
    df.head(100)
    df.tail(100)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.head(100)
    df.tail(100)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"dataframe_head_tail","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
