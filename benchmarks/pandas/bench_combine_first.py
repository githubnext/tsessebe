import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s1 = pd.Series(rng.standard_normal(100_000))
s2 = pd.Series(rng.standard_normal(100_000))
# Put NaN in s1
s1[::3] = float("nan")
for _ in range(3): s1.combine_first(s2)
N = 50
t0 = time.perf_counter()
for _ in range(N): s1.combine_first(s2)
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "combine_first", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
