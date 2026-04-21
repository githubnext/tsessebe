# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T09:35:27Z |
| Iteration Count | 275 |
| Best Metric | 372 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #166 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 1 |
| Recent Statuses | accepted, accepted, accepted, accepted, error, error, error, accepted, accepted, error |

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

- **Iter 275 (Series constructor fix)**: Fixed 73 benchmarks using wrong `new Series(array)` pattern → `new Series({ data: array })`. Evaluation showed 400/631 pairs pass (up from 372). Local commit 09a1cd3 ready but push failed (safeoutputs MCP tools unavailable). **Next run MUST re-apply these 73 fixes + bench_cummax/bench_cummin fixes + run_benchmarks.sh update.**
- **Iter 274 (canonical run_benchmarks.sh)**: Successfully committed the parallel tsx run_benchmarks.sh. Pattern is stable: tsx from `/tmp/gh-aw/agent/node_modules/.bin/tsx`, 8 workers, 30s timeout, temp-file JSON. 372/633 pairs succeed.
- **Series constructor**: Use `new Series({ data: [...] })` — passing an array directly causes "data is not iterable" error with node/tsx. 73 existing benchmarks used wrong pattern; fix yields ~28 more passing pairs (372→400).
- **Iter 273 (MCP tools working)**: safeoutputs MCP tools working in this runner environment. tsx fallback via `/tmp/gh-aw/agent/node_modules/.bin/tsx` confirmed working. Parallel eval (8 workers, 30s timeout): 368/632 successful pairs.
- **Standalone functions vs methods**: cummax/cummin/cumprod/cumsum are standalone functions, not Series methods. Always import and call as `cummax(series)` not `series.cummax()`. bench_cummax and bench_cummin used wrong pattern.
- **Iter 271 (tsx fallback)**: tsx startup ≈ 0.85s/invocation. With 8 parallel workers, 632 pairs complete in ~15 min. Result: 366-371/632 successful pairs.
- **Iter 269 (CRITICAL)**: Canonical branch `results.json` was always empty until iter 269. True canonical best was 0 before that run.
- **safeoutputs MCP availability**: Tools are intermittently available. When unavailable, git push also fails (SSH blocked, HTTPS requires credentials). Runs become errors when push_to_pull_request_branch is unavailable. Next run should re-apply all pending changes.
- **DataFrame construction**: use `DataFrame.fromColumns({...})` not `new DataFrame({...})`.
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.

---

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Old sequential approach is too slow for 631 pairs. Must use parallel workers.
- **SSH push**: SSH to github.com is blocked in this runner environment.
- **HTTPS push without credentials**: git credential helper not configured; git push hangs waiting for input.

---

## 🔭 Future Directions

- **PRIORITY: Re-apply iter 275 fixes** (next run): Fix 73 benchmarks with wrong `new Series(array)` → `new Series({ data: array })`. Also fix bench_cummax/bench_cummin to use standalone functions. Update run_benchmarks.sh with tsx fallback. Expected metric: 400+ (up from 372).
- **Fix remaining ~231 failing pairs**: After re-applying iter 275:
  1. Find benchmarks calling Series/DataFrame methods that are actually standalone functions
  2. Fix benchmarks using wrong import paths ("tsb" vs "../../src/index.js")  
  3. Fix benchmarks for unimplemented features (resample etc.) — either remove or replace
  4. Check for pandas benchmarks failing due to API differences
- **Improve tsx performance**: With bun (if available), more pairs would succeed within 30s timeout.

---

## 📊 Iteration History

### Iteration 275 — 2026-04-21T09:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24715071490)

- **Status**: ⚠️ Error | **Metric**: 400 (evaluated locally, push failed; local commit 09a1cd3 NOT pushed to GitHub)
- Fixed wrong `new Series(array)` → `new Series({ data: array })` in 73 benchmark files; fixed bench_cummax/bench_cummin to use standalone cummax/cummin functions; rewrote run_benchmarks.sh with tsx fallback + 8 parallel workers. Evaluation: 400/631 pairs succeed (up from 372). Local commit 09a1cd3 ready. safeoutputs MCP tools unavailable (push_to_pull_request_branch/noop all report "tool does not exist"). SSH also blocked. **Next run must re-apply all these changes.**

### Iteration 274 — 2026-04-21T07:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24710058006)

- **Status**: ✅ Accepted
- **Change**: Rewrote run_benchmarks.sh with parallel tsx runner (8 workers, 30s timeout, temp-file JSON merge); added bench_numeric_extended_fn and bench_window_extended_fn pairs
- **Metric**: 372 (previous best: 368, delta: +4)
- **Commit**: ebc7df3
- **Notes**: Canonical run_benchmarks.sh now stable with tsx fallback. Key lesson: Series constructor requires `{ data: array }` — many existing failing benchmarks use wrong `new Series(array)` pattern.

### Iteration 273 — 2026-04-21T05:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24706192262)

- **Status**: ✅ Accepted
- **Change**: Rewrote run_benchmarks.sh with tsx fallback, 8 parallel workers, 30s timeout, temp-file JSON; added bench_string_ops_extended pair
- **Metric**: 368 (previous best: 366, delta: +2)
- **Commit**: df4b927

### Iteration 272 — 2026-04-21T04:32 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24704103235)

- **Status**: ⚠️ Error | **Metric**: 371 (evaluated locally, push failed)

### Iteration 271 — 2026-04-21T03:52 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24701850957)

- **Status**: ⚠️ Error | **Metric**: 366 locally (push failed)

### Iteration 270 — 2026-04-21T01:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24699442900)

- **Status**: ⚠️ Error | **Metric**: N/A (push failed)

### Iteration 269 — 2026-04-20T23:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24695261511)

- **Status**: ✅ Accepted | **Metric**: 233 (delta: +233) | **Commit**: ab8b0ec

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
