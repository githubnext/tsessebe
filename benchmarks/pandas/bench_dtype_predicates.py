"""Benchmark: dtype predicate functions using pandas.api.types"""
import json
import time
import pandas as pd
import numpy as np

WARMUP = 3
ITERATIONS = 10_000

dtypes = [
    np.dtype("float64"),
    np.dtype("int32"),
    np.dtype("uint8"),
    np.dtype("bool"),
    pd.StringDtype(),
    np.dtype("datetime64[ns]"),
    pd.CategoricalDtype(),
    np.dtype("O"),
    np.dtype("timedelta64[ns]"),
]


def run_checks():
    for d in dtypes:
        pd.api.types.is_numeric_dtype(d)
        pd.api.types.is_integer_dtype(d)
        pd.api.types.is_float_dtype(d)
        pd.api.types.is_bool_dtype(d)
        pd.api.types.is_string_dtype(d)
        pd.api.types.is_datetime64_any_dtype(d)
        pd.api.types.is_categorical_dtype(d)
        pd.api.types.is_signed_integer_dtype(d)
        pd.api.types.is_unsigned_integer_dtype(d)
        pd.api.types.is_timedelta64_dtype(d)
        pd.api.types.is_object_dtype(d)
        pd.api.types.is_complex_dtype(d)
        pd.api.types.is_extension_array_dtype(d)
        pd.api.types.is_period_dtype(d)
        pd.api.types.is_interval_dtype(d)


for _ in range(WARMUP):
    run_checks()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run_checks()
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "dtype_predicates", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
