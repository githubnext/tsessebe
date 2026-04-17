"""
Benchmark: pandas CategoricalIndex modification — rename_categories, reorder_categories,
remove_categories, set_categories, remove_unused_categories on a 10k-element index.
Outputs JSON: {"function": "categorical_index_modify", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

CATS = ["alpha", "beta", "gamma", "delta", "epsilon"]
labels = [CATS[i % len(CATS)] for i in range(SIZE)]
ci = pd.CategoricalIndex(labels)

for _ in range(WARMUP):
    ci.rename_categories(["A", "B", "C", "D", "E"])
    ci.reorder_categories(["epsilon", "delta", "gamma", "beta", "alpha"])
    ci.remove_categories(["epsilon"])
    ci.set_categories(["alpha", "beta", "gamma"])
    ci.remove_unused_categories()
    ci.as_ordered()
    ci.as_unordered()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    ci.rename_categories(["A", "B", "C", "D", "E"])
    ci.reorder_categories(["epsilon", "delta", "gamma", "beta", "alpha"])
    ci.remove_categories(["epsilon"])
    ci.set_categories(["alpha", "beta", "gamma"])
    ci.remove_unused_categories()
    ci.as_ordered()
    ci.as_unordered()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "categorical_index_modify",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
