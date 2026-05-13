import json
import time

N = 50_000
data = [f"label_{i % 1000}" if i % 2 == 0 else i % 1000 for i in range(N)]

def hash_biject_array(arr):
    """Assign a stable integer code to each unique value."""
    mapping = {}
    codes = []
    next_code = 0
    for v in arr:
        k = (type(v).__name__, v)
        if k not in mapping:
            mapping[k] = next_code
            next_code += 1
        codes.append(mapping[k])
    return codes, {v: k for k, v in mapping.items()}

def hash_biject_inverse(codes, inverse_map):
    return [inverse_map[c] for c in codes]

# Warm-up
for _ in range(10):
    codes, inv = hash_biject_array(data)
    hash_biject_inverse(codes, inv)

iterations = 50
start = time.perf_counter()
for _ in range(iterations):
    codes, inv = hash_biject_array(data)
    hash_biject_inverse(codes, inv)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "hash_biject_array",
    "mean_ms": total_ms / iterations,
    "iterations": iterations,
    "total_ms": total_ms,
}))
