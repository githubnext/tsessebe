"""
Benchmark: pandas read_csv with options — sep, header, skiprows, dtype casting.
Outputs JSON: {"function": "read_csv_options", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import io
import time
import pandas as pd
import numpy as np

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

# Build pipe-separated CSV (no header)
pipe_lines = [f"{i}|{i * 1.1:.4f}|cat_{i % 50}" for i in range(ROWS)]
pipe_csv = "\n".join(pipe_lines)

# Build comma-separated CSV (skip first 2 rows)
skip_lines = ["# comment row 1", "# comment row 2", "id,value,label"] + \
    [f"{i},{i * 2.2:.4f},grp_{i % 20}" for i in range(ROWS)]
skip_csv = "\n".join(skip_lines)

# Build CSV for dtype override
dtype_lines = ["id,value,flag"] + [f"{i},{i * 1.5},{i % 2}" for i in range(ROWS)]
dtype_csv = "\n".join(dtype_lines)

for _ in range(WARMUP):
    pd.read_csv(io.StringIO(pipe_csv), sep="|", header=None)
    pd.read_csv(io.StringIO(skip_csv), skiprows=2)
    pd.read_csv(io.StringIO(dtype_csv), dtype={"id": "int32", "value": "float32"})

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.read_csv(io.StringIO(pipe_csv), sep="|", header=None)
    pd.read_csv(io.StringIO(skip_csv), skiprows=2)
    pd.read_csv(io.StringIO(dtype_csv), dtype={"id": "int32", "value": "float32"})
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / ITERATIONS
print(json.dumps({
    "function": "read_csv_options",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
