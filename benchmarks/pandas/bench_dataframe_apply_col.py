import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
df = pd.DataFrame(rng.standard_normal((10_000, 5)), columns=list("ABCDE"))
for _ in range(3): df.apply(lambda col: col.mean(), axis=0)
N = 100
t0 = time.perf_counter()
for _ in range(N): df.apply(lambda col: col.mean(), axis=0)
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "dataframe_apply_col", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
