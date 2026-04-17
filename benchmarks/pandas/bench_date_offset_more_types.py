"""Benchmark: DateOffset more types — MonthBegin, YearEnd, Week, Minute, Milli apply.
Mirrors tsb bench_date_offset_more_types.ts for pandas.tseries.offsets.
"""
import json, time
from datetime import timedelta
import pandas as pd
from pandas.tseries.offsets import MonthBegin, YearEnd, Week, Minute, Milli

SIZE = 5_000
WARMUP = 5
ITERATIONS = 50

month_begin = MonthBegin(1)
year_end = YearEnd(1)
week = Week(2)
minute = Minute(60)
milli = Milli(1000)

base = pd.Timestamp("2020-01-15 10:30:00", tz="UTC")
dates = [base + timedelta(minutes=i) for i in range(SIZE)]

for _ in range(WARMUP):
    for d in dates[:100]:
        d + month_begin
        d + year_end
        d + week
        d + minute
        d + milli

start = time.perf_counter()
for _ in range(ITERATIONS):
    for d in dates:
        d + month_begin
        d + year_end
        d + week
        d + minute
        d + milli
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "date_offset_more_types",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
