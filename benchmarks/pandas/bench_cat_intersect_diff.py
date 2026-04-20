"""
Benchmark: pandas category set operations — intersection and difference of
categorical Series categories (100k-element, 20 categories each).
Mirrors tsb's catIntersectCategories / catDiffCategories.
Outputs JSON: {"function": "cat_intersect_diff", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

cats_a = [f"cat_a_{i}" for i in range(20)]
cats_b = [f"cat_{'a' if i < 10 else 'b'}_{i}" for i in range(20)]

data_a = [cats_a[i % len(cats_a)] for i in range(SIZE)]
data_b = [cats_b[i % len(cats_b)] for i in range(SIZE)]

s_a = pd.Categorical(data_a, categories=cats_a)
s_b = pd.Categorical(data_b, categories=cats_b)

def cat_intersect(a, b):
    """Return new Categorical with categories = intersection of a.categories and b.categories."""
    b_set = set(b.categories)
    intersected = [c for c in a.categories if c in b_set]
    return pd.Categorical(a, categories=intersected)

def cat_diff(a, b):
    """Return new Categorical with categories = a.categories - b.categories."""
    b_set = set(b.categories)
    remaining = [c for c in a.categories if c not in b_set]
    return pd.Categorical(a, categories=remaining)

for _ in range(WARMUP):
    cat_intersect(s_a, s_b)
    cat_diff(s_a, s_b)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    cat_intersect(s_a, s_b)
    cat_diff(s_a, s_b)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "cat_intersect_diff",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
