---
schedule: every 6h
---

# Performance Comparison: tsb (TypeScript) vs pandas (Python)

## Goal

Systematically benchmark every tsb function against its pandas equivalent, one function per iteration. Each iteration picks a function that has not yet been benchmarked, writes a matching performance test for both tsb (TypeScript/Bun) and pandas (Python), runs both, and records the timing results. The benchmark results are displayed on the playground pages doc site.

This is an open-ended program — it runs continuously, always adding the next benchmark comparison.

### How each iteration works

1. **Read existing benchmarks** — check `benchmarks/tsb/` and `benchmarks/pandas/` to see which functions are already benchmarked.
2. **Pick ONE function** from `src/` that has no benchmark yet. Prioritize core operations (Series, DataFrame, GroupBy, etc.).
3. **Write a TypeScript benchmark** in `benchmarks/tsb/bench_{function}.ts` that:
   - Creates a realistic dataset (e.g. 100,000 rows)
   - Runs the operation in a tight loop (warm-up + measured iterations)
   - Outputs JSON: `{"function": "...", "mean_ms": ..., "iterations": ..., "total_ms": ...}`
4. **Write a matching Python benchmark** in `benchmarks/pandas/bench_{function}.py` that:
   - Creates the same dataset as the TypeScript version
   - Runs the same operation with the same loop structure
   - Outputs the same JSON format
5. **Run both benchmarks** via `benchmarks/run_benchmarks.sh` and capture results.
6. **Update `benchmarks/results.json`** with the new timing data.
7. **Update `playground/benchmarks.html`** to display the new function's comparison metrics.

### Key constraints

- **Matching datasets** — both benchmarks must use identical data (same size, same values where possible).
- **Fair comparison** — same number of warm-up and measured iterations for both.
- **JSON output** — every benchmark script must output a single JSON line to stdout.
- **No modifications to `src/`** — benchmark code is separate from library code.
- **Python environment** — install pandas via pip if not present.

## Target

Only modify these files:
- `benchmarks/**` — benchmark scripts and results
- `playground/benchmarks.html` — performance comparison playground page
- `playground/index.html` — add/update link to benchmarks page

Do NOT modify:
- `src/**` — library source code
- `tests/**` — test files
- `README.md` — read-only
- `.autoloop/programs/**` — program definitions (except this file's code/ dir)
- `.github/workflows/autoloop*` — autoloop workflow files

## Evaluation

```bash
# Set up Python environment if needed
if ! command -v python3 &>/dev/null; then
  echo "Python3 not found, skipping"
fi
pip3 install pandas --quiet 2>/dev/null || true

# Count the number of benchmark pairs (functions with both TS and Python benchmarks)
ts_benchmarks=$(ls benchmarks/tsb/bench_*.ts 2>/dev/null | wc -l | tr -d ' ')
py_benchmarks=$(ls benchmarks/pandas/bench_*.py 2>/dev/null | wc -l | tr -d ' ')

# The metric is the minimum of the two (both must exist for a complete benchmark)
if [ "$ts_benchmarks" -lt "$py_benchmarks" ]; then
  count=$ts_benchmarks
else
  count=$py_benchmarks
fi

echo "{\"benchmarked_functions\": ${count:-0}}"
```

The metric is `benchmarked_functions`. **Higher is better.**
