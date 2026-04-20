"""
Benchmark: pandas formatter factories (lambda closures applied with Series.map)
Mirrors tsb's makeFloatFormatter / makePercentFormatter / makeCurrencyFormatter
applied via applySeriesFormatter on a 100k-element Series.
Outputs JSON: {"function": "formatter_factories", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

data = [i * 0.0001234 for i in range(SIZE)]
s = pd.Series(data)

def make_float_formatter(decimals=3):
    return lambda v: f"{v:.{decimals}f}" if isinstance(v, (int, float)) else str(v)

def make_percent_formatter(decimals=1):
    return lambda v: f"{v * 100:.{decimals}f}%" if isinstance(v, (int, float)) else str(v)

def make_currency_formatter(symbol="€", decimals=2):
    return lambda v: f"{symbol}{v:,.{decimals}f}" if isinstance(v, (int, float)) else str(v)

float_fmt = make_float_formatter(3)
pct_fmt = make_percent_formatter(1)
curr_fmt = make_currency_formatter("€", 2)

for _ in range(WARMUP):
    s.map(float_fmt)
    s.map(pct_fmt)
    s.map(curr_fmt)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.map(float_fmt)
    s.map(pct_fmt)
    s.map(curr_fmt)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "formatter_factories",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
