import json
import time
import pandas as pd

N = 50_000
CATS = ["alpha", "beta", "gamma", "delta", "epsilon"]
data = [CATS[i % len(CATS)] for i in range(N)]
s = pd.Categorical(data, categories=CATS)
series = pd.Series(s)

# Warm-up
for _ in range(10):
    _ = series.cat.categories
    _ = series.cat.codes
    series.cat.add_categories(["zeta"])
    series.cat.remove_unused_categories()

iterations = 100
start = time.perf_counter()
for _ in range(iterations):
    _ = series.cat.categories
    _ = series.cat.codes
    series.cat.add_categories(["zeta"])
    series.cat.remove_unused_categories()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "cat_accessor",
    "mean_ms": total_ms / iterations,
    "iterations": iterations,
    "total_ms": total_ms,
}))
