"""
Benchmark: Python natural sort key equivalent — natsort library or manual tokenization.
Uses natsort if available, else falls back to a simple tokenizer.
Outputs JSON: {"function": "nat_sort_key", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import re

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

data = [f"file{i % 1000}_v{(i % 10) + 1}.{i % 100}" for i in range(SIZE)]
mixed_case = [f"Item{i % 500}_Part{(i % 20) + 1}" for i in range(SIZE)]


def nat_sort_key(s: str, ignore_case: bool = False) -> list:
    """Simple natural sort key tokenizer (matches tsb natSortKey logic)."""
    if ignore_case:
        s = s.lower()
    parts = re.split(r"(\d+)", s)
    return [int(p) if p.isdigit() else p for p in parts]


for _ in range(WARMUP):
    for j in range(SIZE):
        nat_sort_key(data[j])
        nat_sort_key(mixed_case[j], ignore_case=True)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for j in range(SIZE):
        nat_sort_key(data[j])
        nat_sort_key(mixed_case[j], ignore_case=True)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({"function": "nat_sort_key", "mean_ms": round(mean_ms, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
