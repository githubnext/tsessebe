"""
Benchmark: pipe chaining utilities — pipeChain / pipeTo / dataFramePipeChain / dataFramePipeTo.
Outputs JSON: {"function": "pipe_chain_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE) * 0.5 - SIZE * 0.25)
df = pd.DataFrame({
    "a": np.arange(SIZE) * 0.5,
    "b": np.arange(SIZE) * 0.3 + 1,
})

def double(x): return x * 2
def add_one(x): return x + 1
def abs_val(x): return x.abs()

# pandas equivalent of pipeChain: .pipe(fn1).pipe(fn2).pipe(fn3)
# pandas equivalent of pipeTo: .pipe(fn, *args) with positional arg

for _ in range(WARMUP):
    s.pipe(double).pipe(add_one).pipe(abs_val)
    s.pipe(abs_val)
    df.pipe(double).pipe(abs_val)
    df.pipe(abs_val)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.pipe(double).pipe(add_one).pipe(abs_val)
    s.pipe(abs_val)
    df.pipe(double).pipe(abs_val)
    df.pipe(abs_val)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pipe_chain_ops",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
