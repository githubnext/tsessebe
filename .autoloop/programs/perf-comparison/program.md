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

The evaluation step (below) runs `benchmarks/run_benchmarks.sh` to execute **every** TS/Python benchmark pair and regenerates `benchmarks/results.json` with the real timing data. That regenerated file is what gets committed on a successful iteration, so when the autoloop branch is merged to `main`, the pages workflow (`.github/workflows/pages.yml`) picks up the real results and `playground/benchmarks.html` renders real comparison data instead of "No benchmark data available yet."

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

The evaluation runs `benchmarks/run_benchmarks.sh`, which executes every TS/Python
benchmark pair and writes real timing data to `benchmarks/results.json`. The metric
is the number of benchmarks that appear in that regenerated file — i.e. the number
of function pairs whose benchmarks actually ran to completion and produced valid
JSON output. This means a benchmark pair is only "counted" if it truly runs, and
the committed `benchmarks/results.json` always reflects real data that the
`pages.yml` workflow will copy to the playground on merge to `main`.

```bash
set -euo pipefail

# Ensure Python and pandas are available
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 is required but not found" >&2
  exit 1
fi
python3 -c "import pandas" 2>/dev/null || pip3 install pandas --quiet

# Ensure Bun is available (install if missing — autoloop runners may not have it).
# Failure to install Bun is logged but does not abort the script, because we must
# still emit the final metric line for autoloop to parse.
if ! command -v bun &>/dev/null; then
  curl -fsSL https://bun.sh/install | bash || echo "WARN: bun install script failed" >&2
  export PATH="$HOME/.bun/bin:$PATH"
fi
if ! command -v bun &>/dev/null; then
  echo "ERROR: bun is not available after install attempt; benchmarks will fail" >&2
fi

# Install JS/TS dependencies so benchmark scripts can import from src/.
# `|| true` keeps the script alive so the final metric is still emitted; any
# errors are visible in the autoloop logs for debugging.
bun install --silent || echo "WARN: bun install failed; benchmarks may fail to import src/" >&2

# Run every benchmark pair and regenerate benchmarks/results.json with real data.
# This is the file .github/workflows/pages.yml copies into the playground, so
# committing it here is what makes real benchmark data appear on the pages site
# once the autoloop branch is merged to main. Output is left visible so
# per-benchmark failures can be diagnosed from autoloop logs; `|| true` ensures
# we still reach the metric emission below if the script exits nonzero.
bash benchmarks/run_benchmarks.sh || echo "WARN: run_benchmarks.sh exited nonzero" >&2

# Metric: number of benchmark entries in the regenerated results.json.
count=$(python3 -c "
import json
try:
    with open('benchmarks/results.json') as f:
        data = json.load(f)
    print(len(data.get('benchmarks', [])))
except Exception:
    print(0)
")

echo "{\"benchmarked_functions\": ${count:-0}}"
```

The metric is `benchmarked_functions`. **Higher is better.**
