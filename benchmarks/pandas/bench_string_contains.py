import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
words = ["apple", "banana", "cherry", "date", "elderberry"]
s = pd.Series(rng.choice(words, size=100_000))
for _ in range(3): s.str.contains("an", regex=False)
N = 50
t0 = time.perf_counter()
for _ in range(N): s.str.contains("an", regex=False)
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "string_contains", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
