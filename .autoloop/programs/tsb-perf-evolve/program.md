---
schedule: every 6h
---

# tsb perf evolve — Series.sortValues vs pandas Series.sort_values

## Goal

Evolve the implementation of `Series.sortValues` (`src/core/series.ts`) so that, on the synthetic benchmark in `code/benchmark.ts`, tsb runs **at least as fast as pandas** on the equivalent `Series.sort_values` call (`code/benchmark.py`).

Concretely, we minimize the **ratio**

    fitness = mean_ms_tsb / mean_ms_pandas

`fitness < 1.0` means tsb is faster than pandas; lower is better. We will keep iterating as long as fitness keeps improving.

This is a **performance-evolution program** — there is one self-contained artifact (`Series.sortValues`), one scalar fitness (the ratio), and many plausible algorithmic families to try (comparison sort, typed-array indirect sort, dtype-dispatched non-comparison sort, batched/SoA, etc.). It is the canonical case for the AlphaEvolve strategy.

### Validity invariants

A candidate is valid iff:

1. The existing test suite for `sortValues` passes: `bun test tests/core/series.sortValues.test.ts` (and any property tests that exercise it).
2. The function signature is unchanged: `sortValues(ascending = true, naPosition: "first" | "last" = "last"): Series<T>`.
3. No new runtime dependencies (devDependencies for benchmarking are fine).
4. TypeScript strict mode is satisfied — no `any`, no `as` casts, no `@ts-ignore`.
5. Behaviour is identical to the current implementation for: numeric (with NaN), string, mixed dtypes, ascending and descending, both `naPosition` values, and an empty Series.

The evaluator runs the test suite and the benchmark; if either fails, the candidate is rejected.

## Target

Only modify these files:
- `src/core/series.ts` — the `sortValues` method body (and any small private helpers inside `series.ts` that it calls). Keep the public signature unchanged.
- `.autoloop/programs/tsb-perf-evolve/code/**` — benchmark scripts and config. (You will rarely need to touch these — the evaluator is fixed; the benchmark dataset is fixed; only tweak if a candidate genuinely needs a new bench scenario.)

Do NOT modify:
- `tests/**` — test files (they are the validity oracle; do not weaken them).
- `README.md` — read-only.
- `.autoloop/programs/**` other than this program's `code/` dir.
- `.github/workflows/autoloop*` — autoloop workflow files.
- Any `src/**` file other than `src/core/series.ts`.

## Evolution Strategy

This program uses the **AlphaEvolve** strategy. On every iteration, read `strategy/alphaevolve.md` and follow it literally — it supersedes the generic analyze/accept/reject steps in the default autoloop loop.

Support files:
- `strategy/alphaevolve.md` — the runtime playbook (operators, parent selection, population rules).
- `strategy/prompts/mutation.md` — framing for exploitation and exploration operators.
- `strategy/prompts/crossover.md` — framing for crossover and migration operators.

Population state lives in the state file on the `memory/autoloop` branch under the `## 🧬 Population` subsection (see the playbook for the schema).

## Evaluation

```bash
set -euo pipefail

# 1. Validity — existing tests for sortValues must still pass.
bun test tests/core/series.sortValues.test.ts >/tmp/perf-evolve-tests.log 2>&1 || {
  echo '{"fitness": null, "rejected_reason": "tests failed"}'
  exit 0
}

# 2. Benchmark — tsb side.
tsb_ms=$(bun run .autoloop/programs/tsb-perf-evolve/code/benchmark.ts | python3 -c "import json,sys; print(json.load(sys.stdin)['mean_ms'])")

# 3. Benchmark — pandas side. Skip gracefully if pandas isn't available.
if ! python3 -c 'import pandas' 2>/dev/null; then
  pip3 install pandas --quiet 2>/dev/null || true
fi
pd_ms=$(python3 .autoloop/programs/tsb-perf-evolve/code/benchmark.py | python3 -c "import json,sys; print(json.load(sys.stdin)['mean_ms'])")

# 4. Fitness = ratio. Lower is better.
ratio=$(python3 -c "print(${tsb_ms} / ${pd_ms})")
echo "{\"fitness\": ${ratio}, \"tsb_mean_ms\": ${tsb_ms}, \"pandas_mean_ms\": ${pd_ms}}"
```

The metric is `fitness` (= `tsb_mean_ms / pandas_mean_ms`). **Lower is better.** A value below `1.0` means tsb is now faster than pandas on this workload.
