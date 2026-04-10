#!/usr/bin/env bash
#
# Run all tsb (TypeScript) and pandas (Python) benchmarks and collect results.
#
# Usage: ./benchmarks/run_benchmarks.sh
#
# Outputs: benchmarks/results.json with all benchmark results
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Ensure Python and pandas are available
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 is required but not found" >&2
  exit 1
fi

python3 -c "import pandas" 2>/dev/null || {
  echo "Installing pandas..."
  pip3 install pandas --quiet
}

# Ensure Bun is available
if ! command -v bun &>/dev/null; then
  echo "ERROR: bun is required but not found" >&2
  exit 1
fi

# Collect results
results='{"benchmarks": [], "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}'

echo "=== Running Performance Benchmarks ==="
echo ""

# Find all TypeScript benchmark files
for ts_bench in "$SCRIPT_DIR"/tsb/bench_*.ts; do
  [ -f "$ts_bench" ] || continue
  bench_name=$(basename "$ts_bench" .ts | sed 's/^bench_//')

  # Check for matching Python benchmark
  py_bench="$SCRIPT_DIR/pandas/bench_${bench_name}.py"
  if [ ! -f "$py_bench" ]; then
    echo "SKIP: $bench_name (no matching Python benchmark)"
    continue
  fi

  echo "--- Benchmarking: $bench_name ---"

  # Run TypeScript benchmark
  echo "  Running tsb (TypeScript)..."
  ts_result=$(cd "$REPO_ROOT" && bun run "$ts_bench" 2>/dev/null) || {
    echo "  ERROR: TypeScript benchmark failed"
    continue
  }
  echo "  tsb result: $ts_result"

  # Run Python benchmark
  echo "  Running pandas (Python)..."
  py_result=$(cd "$REPO_ROOT" && python3 "$py_bench" 2>/dev/null) || {
    echo "  ERROR: Python benchmark failed"
    continue
  }
  echo "  pandas result: $py_result"

  # Extract mean_ms from both
  ts_mean=$(echo "$ts_result" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['mean_ms'])" 2>/dev/null) || {
    echo "  ERROR: could not parse tsb benchmark result"
    continue
  }
  py_mean=$(echo "$py_result" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['mean_ms'])" 2>/dev/null) || {
    echo "  ERROR: could not parse pandas benchmark result"
    continue
  }

  # Calculate ratio (tsb / pandas) — < 1.0 means tsb is faster
  ratio=$(python3 -c "
ts, py = $ts_mean, $py_mean
if py <= 0:
    print('null')
else:
    print(round(ts / py, 3))
")
  if [ "$ratio" = "null" ]; then
    echo "  ERROR: pandas mean_ms is zero, cannot compute ratio"
    continue
  fi

  echo "  Ratio (tsb/pandas): ${ratio}x"
  echo ""

  # Add to results JSON
  results=$(echo "$results" | python3 -c "
import sys, json
data = json.load(sys.stdin)
data['benchmarks'].append({
    'function': '$bench_name',
    'tsb': $ts_result,
    'pandas': $py_result,
    'ratio': $ratio
})
print(json.dumps(data, indent=2))
")
done

# Write results
echo "$results" > "$SCRIPT_DIR/results.json"
echo "=== Results written to benchmarks/results.json ==="
echo ""

# Summary
echo "=== Summary ==="
echo "$results" | python3 -c "
import sys, json
data = json.load(sys.stdin)
benchmarks = data.get('benchmarks', [])
if not benchmarks:
    print('No benchmarks found.')
else:
    print(f'Functions benchmarked: {len(benchmarks)}')
    for b in benchmarks:
        fn = b['function']
        ts = b['tsb']['mean_ms']
        py = b['pandas']['mean_ms']
        ratio = b['ratio']
        faster = 'tsb' if ratio < 1 else 'pandas'
        print(f'  {fn}: tsb={ts}ms, pandas={py}ms, ratio={ratio}x ({faster} is faster)')
"
