"""
Benchmark: pd.read_excel / ExcelFile.sheet_names — parse a 10k-row XLSX file.
Outputs JSON: {"function": "read_excel", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import io
import numpy as np
import pandas as pd

try:
    import openpyxl
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl", "--quiet"])
    import openpyxl

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

# Build an XLSX file in memory using openpyxl
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Sheet1"
ws.append(["id", "name", "value", "score"])
for i in range(ROWS):
    ws.append([i, f"item_{i % 100}", i * 1.5, float(np.sin(i * 0.01))])

buf = io.BytesIO()
wb.save(buf)
xlsx_bytes = buf.getvalue()

for _ in range(WARMUP):
    pd.read_excel(io.BytesIO(xlsx_bytes), engine="openpyxl")
    pd.ExcelFile(io.BytesIO(xlsx_bytes), engine="openpyxl").sheet_names

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_excel(io.BytesIO(xlsx_bytes), engine="openpyxl")
    pd.ExcelFile(io.BytesIO(xlsx_bytes), engine="openpyxl").sheet_names
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "read_excel",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
