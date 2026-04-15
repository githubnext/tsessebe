"""Benchmark: extended value type predicates in Python (closest equivalents)"""
import json
import time
import math
import re

WARMUP = 3
ITERATIONS = 10_000

mixed = [42, 3.14, True, "hello", None, float("nan"), re.compile(r"abc")]


def is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def is_bool(v):
    return isinstance(v, bool)


def is_string_value(v):
    return isinstance(v, str)


def is_float(v):
    return isinstance(v, float)


def is_integer(v):
    return isinstance(v, int) and not isinstance(v, bool)


def is_big_int(v):
    return isinstance(v, int) and not isinstance(v, bool) and (v > 2**53 or v < -(2**53))


def is_regexp(v):
    return isinstance(v, re.Pattern)


def is_re_compilable(v):
    if isinstance(v, re.Pattern):
        return True
    if isinstance(v, str):
        try:
            re.compile(v)
            return True
        except re.error:
            return False
    return False


def is_missing(v):
    if v is None:
        return True
    if isinstance(v, float) and math.isnan(v):
        return True
    return False


def is_hashable(v):
    try:
        hash(v)
        return True
    except TypeError:
        return False


def run_checks():
    for v in mixed:
        is_number(v)
        is_bool(v)
        is_string_value(v)
        is_float(v)
        is_integer(v)
        is_big_int(v)
        is_regexp(v)
        is_re_compilable(v)
        is_missing(v)
        is_hashable(v)


for _ in range(WARMUP):
    run_checks()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run_checks()
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "value_type_checks", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
