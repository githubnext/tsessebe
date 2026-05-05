import pandas as pd
import numpy as np
import json
import time

N = 100_000
object_data = [None if i % 10 == 0 else i for i in range(N)]

obj_series = pd.Series(object_data, dtype=object)
obj_df = pd.DataFrame({"a": object_data, "b": [None if v is None else v * 2 for v in object_data]})

# Warm-up
for _ in range(10):
    obj_series.infer_objects()
    obj_df.infer_objects()

iterations = 100
start = time.perf_counter()
for _ in range(iterations):
    obj_series.infer_objects()
    obj_df.infer_objects()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "infer_objects",
    "mean_ms": total_ms / iterations,
    "iterations": iterations,
    "total_ms": total_ms,
}))
