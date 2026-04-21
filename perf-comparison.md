# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T12:52:00Z |
| Iteration Count | 277 |
| Best Metric | 76 |
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
| Recent Statuses | accepted, error, error, error, accepted, accepted, error, error, accepted, error, accepted |

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

- **Iter 277 (first canonical push success)**: Fixed 42 import files ("tsb"→relative), fixed 82+ Series constructor files, fixed cummax/cummin standalone, rewrote run_benchmarks.sh for parallel npx tsx. Got 76/631 pairs on canonical branch (best so far on canonical). **Next run should investigate why d-z benchmarks time out (alphabetically after `dataframe_to_dict`).**
- **tsx timeout issue**: Benchmarks alphabetically after `dataframe_to_dict` all timeout at 30s. Likely they have large datasets or many iterations. Increasing BENCH_TIMEOUT to 60s may help.
- **Import paths**: Use `../../src/index.ts` not `"tsb"` — the tsb package may not be installed in runner environments. 40 benchmarks used wrong import.
- **Series constructor**: Use `new Series({ data: [...] })` — passing an array directly fails with node/tsx.
- **Standalone functions vs methods**: cummax/cummin/cumprod/cumsum are standalone functions. Call as `cummax(series)` not `series.cummax()`.
- **Parallel tsx**: Use 8 workers + 30s timeout via Python ThreadPoolExecutor. 76/631 pairs succeed in ~20 min.
- **DataFrame construction**: use `DataFrame.fromColumns({...})` not `new DataFrame({...})`.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.

---

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Old sequential approach is too slow for 631 pairs. Must use parallel workers.
- **SSH push**: SSH to github.com is blocked in this runner environment.
- **HTTPS push without credentials**: git credential helper not configured; git push hangs waiting for input.

---

## 🔭 Future Directions

- **Investigate d-z benchmark timeouts**: Benchmarks after `dataframe_to_dict` all timeout. Check if:
  1. They have too many iterations (e.g. 1000+ iterations on 100k rows)
  2. They call methods that don't exist (causing tsx to hang)
  3. Increase BENCH_TIMEOUT to 60s to cover slower benchmarks
- **Fix remaining ~555 failing pairs**: 
  1. Find benchmarks calling Series/DataFrame methods that don't exist (wrong API)
  2. Check benchmarks for unimplemented features (resample, etc.) — replace or skip
  3. Look at Python benchmark failures (may be pandas API differences)
- **Update run_benchmarks.sh**: Add the Python-based parallel runner as the primary approach (save it as `benchmarks/run_benchmarks_parallel.py`)

---

## 📊 Iteration History

### Iteration 277 — 2026-04-21T12:52 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24723312559)

- **Status**: ✅ Accepted
- **Change**: Fix import paths (42 files), Series constructor (82+ files), cummax/cummin standalone; parallel npx tsx runner
- **Metric**: 76 (previous canonical best: 0, delta: +76)
- **Commit**: 0e3c9be
- **Notes**: First successful push to canonical branch. 76/631 pairs succeed; d-z benchmarks all timeout at 30s. Next: investigate timeout cause and increase limit.

### Iteration 276 — 2026-04-21T11:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24719799329)

- **Status**: ⚠️ Error (push failed — safeoutputs MCP tools unavailable)
- **Change**: Fix Series constructor (69 files), import paths (40 files "tsb"→relative), cummax/cummin standalone, parallel tsx run_benchmarks.sh
- **Metric**: 312 (local commit 2032d3e ready; canonical best still 0)
- **Notes**: safeoutputs MCP push_to_pull_request_branch unavailable again. Local commit 2032d3e on autoloop/perf-comparison branch NOT pushed.

### Iters 269–275 — ⚠️ error/wrong-branch | metrics 233-400 but all on suffixed branches, canonical was 0.

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
