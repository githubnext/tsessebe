"""
Benchmark: date parsing utilities — equivalent to advanceDate / parseFreq / toDateInput.
Outputs JSON: {"function": "date_utils_na", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
from datetime import datetime

WARMUP = 5
ITERATIONS = 200

d = pd.Timestamp("2023-06-15")

for _ in range(WARMUP):
    pd.tseries.frequencies.to_offset("D")
    pd.tseries.frequencies.to_offset("MS")
    d + pd.tseries.frequencies.to_offset("D")
    d + pd.tseries.frequencies.to_offset("MS")
    d + pd.tseries.frequencies.to_offset("QS")
    pd.Timestamp("2023-06-15")
    pd.Timestamp(1686787200000, unit="ms")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.tseries.frequencies.to_offset("D")
    pd.tseries.frequencies.to_offset("MS")
    d + pd.tseries.frequencies.to_offset("D")
    d + pd.tseries.frequencies.to_offset("MS")
    d + pd.tseries.frequencies.to_offset("QS")
    pd.Timestamp("2023-06-15")
    pd.Timestamp(1686787200000, unit="ms")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "date_utils_na",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
