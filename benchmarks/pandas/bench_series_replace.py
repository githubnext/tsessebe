import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.integers(0, 10, size=100_000))
mapping = {i: i*10 for i in range(10)}
for _ in range(3): s.replace(mapping)
N = 50
t0 = time.perf_counter()
for _ in range(N): s.replace(mapping)
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "series_replace", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
