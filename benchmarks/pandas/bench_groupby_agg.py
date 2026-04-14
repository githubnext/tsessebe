import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
df = pd.DataFrame({
    "group": rng.choice(["A","B","C","D","E"], size=100_000),
    "val1": rng.standard_normal(100_000),
    "val2": rng.standard_normal(100_000),
})
for _ in range(3): df.groupby("group").agg({"val1": ["mean","std","min","max"], "val2": ["sum","count"]})
N = 30
t0 = time.perf_counter()
for _ in range(N): df.groupby("group").agg({"val1": ["mean","std","min","max"], "val2": ["sum","count"]})
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "groupby_agg", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
