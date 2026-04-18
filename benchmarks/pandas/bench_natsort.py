"""Benchmark: natsort — natural-order sorting of 10k strings with numeric suffixes.

Mirrors tsb's natSorted / natCompare / natSortKey / natArgSort using the
Python `natsort` package (falls back to a manual key if natsort not installed).
"""
import json, time

N = 10_000
WARMUP = 3
ITERATIONS = 10

# Build the same dataset as the TS benchmark
items = [f"item{N - i}" for i in range(N)]

try:
    from natsort import natsorted, natsort_keygen
    nat_key = natsort_keygen()
    def run():
        natsorted(items)
        nat_key("file42")
except ImportError:
    # Fallback: manual digit-aware key (equivalent logic)
    import re
    def _nat_key(s):
        return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s)]
    def run():
        sorted(items, key=_nat_key)
        _nat_key("file42")

for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "natsort",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
