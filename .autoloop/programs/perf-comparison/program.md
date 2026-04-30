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
5. **Update `playground/benchmarks.html`** if needed to display the new function's comparison metrics.

The autoloop iteration only needs to add the benchmark scripts; it does **not** need to run them or update `benchmarks/results.json`. The pages workflow (`.github/workflows/pages.yml`) executes `benchmarks/run_benchmarks.sh` on every push to `main` and publishes the regenerated `results.json` to the playground site, so real benchmark data appears on `playground/benchmarks.html` once the autoloop branch is merged.

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

The evaluation block runs validity checks **before** counting benchmark pairs.
If any benchmark script is syntactically invalid (or required tooling is
missing), the metric is reported as `null` so the iteration is rejected
rather than silently accepted with broken benchmarks.

```bash
# Set up Python environment if needed.
if ! command -v python3 &>/dev/null; then
  echo '{"benchmarked_functions": null, "rejected_reason": "python3 not available"}'
  exit 0
fi
pip3 install pandas --quiet 2>/dev/null || true

# Validity: every TypeScript benchmark must transpile cleanly.
# `bun build` parses, type-aware-transpiles, and resolves imports — any of
# those failing means the benchmark would fail at run time. We discard the
# build output; we only care about the exit status.
if command -v bun &>/dev/null; then
  for f in benchmarks/tsb/bench_*.ts; do
    [ -e "$f" ] || break
    if ! bun build "$f" --outdir=/tmp/perf-comparison-bench-check >/dev/null 2>&1; then
      echo "{\"benchmarked_functions\": null, \"rejected_reason\": \"invalid TypeScript benchmark: $f\"}"
      exit 0
    fi
  done
else
  echo '{"benchmarked_functions": null, "rejected_reason": "bun not available"}'
  exit 0
fi

# Validity: every Python benchmark must compile (parse) cleanly.
for f in benchmarks/pandas/bench_*.py; do
  [ -e "$f" ] || break
  if ! python3 -m py_compile "$f" 2>/dev/null; then
    echo "{\"benchmarked_functions\": null, \"rejected_reason\": \"invalid Python benchmark: $f\"}"
    exit 0
  fi
done

# Count the number of benchmark pairs (functions with both TS and Python benchmarks).
ts_benchmarks=$(ls benchmarks/tsb/bench_*.ts 2>/dev/null | wc -l | tr -d ' ')
py_benchmarks=$(ls benchmarks/pandas/bench_*.py 2>/dev/null | wc -l | tr -d ' ')

# The metric is the minimum of the two (both must exist for a complete benchmark).
if [ "$ts_benchmarks" -lt "$py_benchmarks" ]; then
  count=$ts_benchmarks
else
  count=$py_benchmarks
fi

echo "{\"benchmarked_functions\": ${count:-0}}"
```

The metric is `benchmarked_functions`. **Higher is better.** When validity
checks fail the metric is `null`, which the autoloop runner treats as a
rejected iteration.
