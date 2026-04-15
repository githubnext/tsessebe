"""Benchmark: pandas Series attrs advanced — individual attr get/set/delete/copy/merge"""
import json, time
import pandas as pd

WARMUP = 3
ITERATIONS = 1_000

s = pd.Series(range(1_000))
s2 = pd.Series(range(1_000))

for _ in range(WARMUP):
    s.attrs["unit"] = "meters"
    _ = s.attrs.get("unit")
    _ = bool(s.attrs)
    s2.attrs.update(dict(s.attrs))
    s.attrs.update({"version": 1})
    s.attrs.pop("unit", None)
    s.attrs.clear()

start = time.perf_counter()
for i in range(ITERATIONS):
    s.attrs["unit"] = "meters"
    _ = s.attrs.get("unit")
    _ = bool(s.attrs)
    s2.attrs.update(dict(s.attrs))
    s.attrs.update({"version": i})
    s.attrs.pop("unit", None)
    s.attrs.clear()
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "attrs_advanced", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
