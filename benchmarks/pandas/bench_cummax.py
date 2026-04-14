import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.standard_normal(100_000))
for _ in range(3): s.cummax()
N = 100
t0 = time.perf_counter()
for _ in range(N): s.cummax()
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "cummax", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
