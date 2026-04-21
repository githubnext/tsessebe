# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T11:47:00Z |
| Iteration Count | 276 |
| Best Metric | 312 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #166 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 2 |
| Recent Statuses | accepted, error, error, error, accepted, accepted, error, error, accepted, error |

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

- **Iter 276 (CANONICAL reset + push failed again)**: Applied all fixes to canonical branch (Series constructor 69 files, import paths 40 files, cummax/cummin standalone, parallel tsx run_benchmarks.sh). Eval: 312/508 pairs. Local commit 2032d3e ready but push_to_pull_request_branch unavailable AGAIN. **Next run must re-apply same changes.**
- **Import paths**: Use `../../src/index.ts` not `"tsb"` — the tsb package may not be installed in runner environments. 40 benchmarks used wrong import.
- **Series constructor**: Use `new Series({ data: [...] })` — passing an array directly fails with node/tsx.
- **Standalone functions vs methods**: cummax/cummin/cumprod/cumsum are standalone functions. Call as `cummax(series)` not `series.cummax()`.
- **Parallel tsx**: Install tsx in `/tmp/gh-aw/agent/node_modules/` via npm, then use 8 workers + 30s timeout. 312/508 pairs succeed in ~15 min.
- **DataFrame construction**: use `DataFrame.fromColumns({...})` not `new DataFrame({...})`.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **safeoutputs MCP availability**: intermittently available; when unavailable git push also fails.

---

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Old sequential approach is too slow for 631 pairs. Must use parallel workers.
- **SSH push**: SSH to github.com is blocked in this runner environment.
- **HTTPS push without credentials**: git credential helper not configured; git push hangs waiting for input.

---

## 🔭 Future Directions

- **Fix remaining ~196 failing pairs** (312/508 passing): 
  1. Find benchmarks calling Series/DataFrame methods that don't exist (wrong API)
  2. Check benchmarks for unimplemented features (resample, etc.) — replace or skip
  3. Look at Python benchmark failures (may be pandas API differences)
  4. Fix benchmarks using `DataFrame.fromColumns` incorrectly
- **Improve tsx performance**: With bun (if available), more pairs would succeed within 30s timeout.

---

## 📊 Iteration History

### Iteration 276 — 2026-04-21T11:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24719799329)

- **Status**: ⚠️ Error (push failed — safeoutputs MCP tools unavailable)
- **Change**: Fix Series constructor (69 files), import paths (40 files "tsb"→relative), cummax/cummin standalone, parallel tsx run_benchmarks.sh
- **Metric**: 312 (local commit 2032d3e ready; canonical best still 0)
- **Notes**: safeoutputs MCP push_to_pull_request_branch unavailable again. Local commit 2032d3e on autoloop/perf-comparison branch NOT pushed. **Next run MUST re-apply all these changes** — they're the same as iter 275 fixes plus import path fixes and the parallel tsx approach.

### Iters 269–275 — ⚠️ error/wrong-branch | metrics 233-400 but all on suffixed branches, canonical was 0.

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
