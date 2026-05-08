"""Benchmark: Styler — highlight max/min and background gradient on a 1000-row DataFrame"""
import json
import time
import math
import pandas as pd
import numpy as np

N = 1_000
WARMUP = 2
ITERATIONS = 5

a = [i * 1.0 for i in range(N)]
b = [(N - i) * 2.0 for i in range(N)]
c = [math.sin(i / 100) * 100 for i in range(N)]
df = pd.DataFrame({"a": a, "b": b, "c": c})

def run_styler():
    styler = df.style.highlight_max().highlight_min().background_gradient()
    styler.to_html()  # force rendering

for _ in range(WARMUP):
    run_styler()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run_styler()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "styler",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
