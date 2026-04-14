import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
idx = pd.date_range("2020-01-01", periods=100_000, freq="1min")
s = pd.Series(rng.standard_normal(100_000), index=idx)
for _ in range(3): s.resample("1h").mean()
N = 50
t0 = time.perf_counter()
for _ in range(N): s.resample("1h").mean()
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "resample", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
