"""Benchmark: DataFrame.astype() — cast column dtypes."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({"a":[float(i) for i in range(SIZE)],"b":[i for i in range(SIZE)]})

for _ in range(WARMUP):
    df.astype({"a": "float32", "b": "int32"})

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.astype({"a": "float32", "b": "int32"})
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"dataframe_astype","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
