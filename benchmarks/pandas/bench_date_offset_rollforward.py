"""Benchmark: DateOffset.rollforward / rollback / is_on_offset — snap dates to anchors.
Mirrors tsb bench_date_offset_rollforward.ts for pandas.tseries.offsets.
"""
import json, time
from datetime import datetime, timezone, timedelta
from pandas.tseries.offsets import MonthEnd, BusinessDay, YearBegin, MonthBegin, YearEnd

SIZE = 5_000
WARMUP = 5
ITERATIONS = 50

month_end = MonthEnd(1)
biz_day = BusinessDay(1)
year_begin = YearBegin(1)
month_begin = MonthBegin(1)
year_end = YearEnd(1)

import pandas as pd
base = pd.Timestamp("2020-01-15", tz="UTC")
dates = [base + timedelta(days=i) for i in range(SIZE)]

for _ in range(WARMUP):
    for d in dates[:100]:
        month_end.rollforward(d)
        month_end.rollback(d)
        month_end.is_on_offset(d)
        biz_day.rollforward(d)
        biz_day.rollback(d)
        biz_day.is_on_offset(d)
        year_begin.rollforward(d)
        year_begin.rollback(d)
        month_begin.rollforward(d)
        month_begin.rollback(d)
        year_end.rollforward(d)
        year_end.rollback(d)

start = time.perf_counter()
for _ in range(ITERATIONS):
    for d in dates:
        month_end.rollforward(d)
        month_end.rollback(d)
        month_end.is_on_offset(d)
        biz_day.rollforward(d)
        biz_day.rollback(d)
        year_begin.rollforward(d)
        year_begin.rollback(d)
        month_begin.rollforward(d)
        month_begin.rollback(d)
        year_end.rollforward(d)
        year_end.rollback(d)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "date_offset_rollforward",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
