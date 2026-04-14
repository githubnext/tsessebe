import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
# Each row has a list of 1-5 items
data = [[int(x) for x in rng.integers(0, 100, size=rng.integers(1, 6))] for _ in range(10_000)]
s = pd.Series(data)
for _ in range(3): s.explode()
N = 50
t0 = time.perf_counter()
for _ in range(N): s.explode()
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "explode", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
