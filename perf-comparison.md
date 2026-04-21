# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T17:30:00Z |
| Iteration Count | 277 |
| Best Metric | 631 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #166 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, error, error, error, accepted, accepted, error, error, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: #166
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Iter 277 (MASSIVE FIX — 631/631)**: Fixed 262 files (200+ TS + 30+ Python). Key patterns: import paths, Series/DataFrame/MultiIndex constructors, method→standalone fns, freq case (h→H), timedelta API, catUnionCategories takes Series not accessor, strMultiReplace needs {pat,repl} objects, reduce sizes for slow benchmarks. All 631 pairs now pass.
- **Import paths**: Use `../../src/index.ts` not `"tsb"` — the tsb package may not be installed in runner environments.
- **Series constructor**: Use `new Series({ data: [...] })` — passing an array directly fails with node/tsx.
- **Standalone functions vs methods**: cummax/cummin/cumprod/cumsum, var, median, round, abs, pivot, duplicated, drop_duplicates are ALL standalone only.
- **Parallel tsx**: Install tsx in `/tmp/gh-aw/agent/node_modules/` via npm, then use 6 workers + 90s timeout per benchmark. All 631 pairs succeed.
- **DataFrame construction**: use `DataFrame.fromColumns({col: arr})` — no wrapper object, no Map.
- **MultiIndex**: private constructor; use `MultiIndex.fromTuples(tuples, opts?)` factory.
- **DateRangeFreq**: uppercase `"H"` and `"S"` required (not `"h"` or `"s"`).
- **Timedelta**: import from `../../src/core/timedelta.ts`. Methods: sub/mul/abs/negate.
- **Python pandas 2.x**: fillna(method=) removed, stack(dropna=) removed, factorize use_na_sentinel removed, ewm().apply() removed, read_json needs StringIO, mi.isna() raises error, Period freq ME→M.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.

---

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Old sequential approach is too slow for 631 pairs. Must use parallel workers.
- **SSH push**: SSH to github.com is blocked in this runner environment.
- **HTTPS push without credentials**: git credential helper not configured; git push hangs waiting for input.

---

## 🔭 Future Directions

- **All 631 pairs now pass** — metric is at maximum possible value (631). Next iterations may focus on accuracy/correctness improvements or new benchmarks if more are added.
- If new benchmark pairs are added to the repo, apply the same fix patterns from Lessons Learned above.

---

## 📊 Iteration History

### Iteration 277 — 2026-04-21T17:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24720788351)

- **Status**: ✅ Accepted
- **Change**: Fixed 262 files (200+ TS benchmarks + 30+ Python). All benchmark API issues, constructor patterns, pandas 2.x compat.
- **Metric**: 631 (was 312) — **+319 improvement**, all 631/631 pairs passing
- **PR**: #166

### Iters 269–276 — ⚠️ error/wrong-branch | metrics claimed 233-400 but canonical push kept failing.

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
