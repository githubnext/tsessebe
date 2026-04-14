import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.standard_normal(100_000))
for _ in range(3): s.sample(n=1000, random_state=42)
N = 100
t0 = time.perf_counter()
for _ in range(N): s.sample(n=1000, random_state=42)
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "sample", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
