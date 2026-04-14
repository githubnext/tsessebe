import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
rows = 100
cols = 20
df = pd.DataFrame({
    "row": np.repeat(range(rows), cols),
    "col": list(range(cols)) * rows,
    "val": rng.standard_normal(rows * cols),
})
for _ in range(3): df.pivot(index="row", columns="col", values="val")
N = 100
t0 = time.perf_counter()
for _ in range(N): df.pivot(index="row", columns="col", values="val")
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "pivot", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
