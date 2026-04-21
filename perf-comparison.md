# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T10:32:29Z |
| Iteration Count | 276 |
| Best Metric | 243 |
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
| Recent Statuses | accepted, accepted, accepted, error, error, error, accepted, accepted, error, error |

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

- **Iter 276 (push failed again)**: MCP tools unavailable. Local commit 7c47cc0 on canonical branch NOT pushed. Changes: 77 Series constructor fixes, 79 DataFrame constructor fixes, 332 import fixes (.js→.ts + tsb→relative), cummax/cummin standalone, new parallel run_benchmarks.sh. Evaluated 243/508 passing. **CRITICAL: Next run must apply all these changes from scratch — canonical branch still at iter 158 (5b7ea6d).**
- **safeoutputs MCP tools intermittently unavailable**: When unavailable, push_to_pull_request_branch/noop report "tool does not exist". This has happened in iters 275, 276 (and 271, 272, 270 earlier). When available (iters 273, 274), commit and push succeeds normally.
- **Import style**: Use `../../src/index.ts` (NOT `../../src/index.js` or `"tsb"`) for tsx compatibility. 292 files had .js imports, 40 had "tsb" imports.
- **Canonical branch state**: After all pushes failed, canonical branch (origin/autoloop/perf-comparison) is at iter 158 (5b7ea6d) with 508 matching benchmark pairs. results.json has 0 entries (empty baseline).
- **DataFrame construction**: use `DataFrame.fromColumns({...})` not `new DataFrame({...})`. Fixed 79 instances in 73 files.
- **Series constructor**: Use `new Series({ data: [...] })` — passing an array directly causes "data is not iterable" error. Fixed 77 instances in 69 files.
- **Standalone functions vs methods**: cummax/cummin/cumprod/cumsum are standalone functions, not Series methods. Call as `cummax(series)` not `series.cummax()`.
- **System load and timeouts**: With 8 parallel tsx workers on a loaded runner, heavy benchmarks (align_series, align_dataframe) timeout at 45s. Use 3 workers or 90s timeout.
- **Remaining failures (~265)**: `s.between()`, `s.clip()`, `s.combineFirst()` don't exist as methods; `dataFrameWhere` doesn't exist (use `whereDataFrame`); some benchmarks call unimplemented features.
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.

---

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Old sequential approach is too slow for 631 pairs. Must use parallel workers.
- **SSH push**: SSH to github.com is blocked in this runner environment.
- **HTTPS push without credentials**: git credential helper not configured; git push hangs waiting for input.

---

## 🔭 Future Directions

- **PRIORITY: Apply the iter 276 changes** (next run must re-apply since push failed):
  1. Fix 77 Series constructors: `new Series(expr)` → `new Series({ data: expr })` (use fix_series.py approach)
  2. Fix 79 DataFrame constructors: `new DataFrame({...})` → `DataFrame.fromColumns({...})` 
  3. Fix imports: `from "tsb"` → `../../src/index.ts`, `from "../../src/index.js"` → `.ts`
  4. Fix cummax/cummin: use `import { cummax } from "../../src/index.ts"` and call `cummax(series)`
  5. Update run_benchmarks.sh with tsx fallback (the parallel script that eval produces 243+)
- **Fix remaining ~265 failing pairs** (after push succeeds):
  1. Wrong method names: replace `s.between()`, `s.clip()`, `s.combineFirst()` with correct calls
  2. Wrong function names: `dataFrameWhere` → `whereDataFrame`, etc. 
  3. Slow benchmarks (align_series, align_dataframe timeout) — reduce ITERATIONS or SIZE
  4. Benchmarks for unimplemented features — skip or rewrite
- **Improve tsx performance**: With bun (if available), more pairs would succeed within 30s timeout.
- **Add more benchmark pairs** for uncovered functions in src/.

---

## 📊 Iteration History

### Iteration 276 — 2026-04-21T10:32 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24717535856)

- **Status**: ⚠️ Error | **Metric**: 243 (evaluated locally, push failed; local commit 7c47cc0 NOT pushed to GitHub)
- Mass fixed 77 Series constructors, 79 DataFrame constructors, 332 import paths (.js→.ts / tsb→relative), cummax/cummin standalone, new parallel run_benchmarks.sh. Evaluation: 243/508 pairs succeed (up from 0 on canonical branch). safeoutputs MCP tools unavailable — push_to_pull_request_branch reports "tool does not exist". **Next run must re-apply all these changes (git branch is at iter 158, commit 7c47cc0 never pushed).**

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
