"""
Benchmark: Python type coercion equivalents — int(), float(), str(), bool() conversions.
Outputs JSON: {"function": "cast_scalar", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

int_values = [i % 1000 for i in range(SIZE)]
float_values = [i * 0.5 for i in range(SIZE)]
str_values = [str(i % 1000) for i in range(SIZE)]
bool_values = [i % 2 == 0 for i in range(SIZE)]

for _ in range(WARMUP):
    for j in range(SIZE):
        int(float_values[j])
        float(int_values[j])
        int(str_values[j])
        int(bool_values[j])

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for j in range(SIZE):
        int(float_values[j])
        float(int_values[j])
        int(str_values[j])
        int(bool_values[j])
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "cast_scalar", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
