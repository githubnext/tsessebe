import pandas as pd
import json
import time

N = 100_000
data = [i % 1000 for i in range(N)]
s = pd.Series(data, dtype=float)

# Warm-up
for _ in range(20):
    s.eq(500)
    s.lt(300)
    s.ge(700)

iterations = 300
start = time.perf_counter()
for _ in range(iterations):
    s.eq(500)
    s.lt(300)
    s.ge(700)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "compare",
    "mean_ms": total_ms / iterations,
    "iterations": iterations,
    "total_ms": total_ms,
}))
