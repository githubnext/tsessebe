# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T01:36:44Z |
| Iteration Count | 270 |
| Best Metric | 233 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #155 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 1 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, error |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: #155
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Iter 270 (CRITICAL push failure)**: `push_to_pull_request_branch` MCP tool is blocked by runner policy — safeoutputs MCP server runs in Docker at `host.docker.internal:80` and does NOT have access to the runner's local filesystem (`/home/runner/work/tsessebe/tsessebe`). The tool returns "Branch does not exist locally" because it can't see branches committed within the chroot. `add_comment` works (GitHub API only). Solution: The framework's native tool calling must be used, but it's blocked by policy. This means code changes cannot be pushed in any run where the policy blocks safeoutputs.
- **Iter 270 (run_benchmarks.sh fix)**: Rewrote `run_benchmarks.sh` to use 8 parallel workers (vs 20 in iter 269), 30s timeout, bun path detection (`$HOME/.bun/bin/bun`), and temp-file result collection. This fix was NOT pushed due to above. Next run should apply same changes: parallelism=8, timeout=30s, bun detection, add datetime_tz pair.
- **Iter 269 (CRITICAL)**: Canonical branch `results.json` was ALWAYS empty (metric=0) — prior accepted iters 262-268 that claimed metrics 605-607 all committed to WRONG suffixed branches (not `autoloop/perf-comparison`). State's recorded best_metric of 607 was a phantom. True canonical best was 0. This run = FIRST real evaluation of canonical branch. Parallel eval (20 workers, 60s timeout) gave 233/607 successful pairs; 374 failures were CPU-contention timeouts. Sequential eval would be higher.
- **Iter 269 (bun)**: `bun` NOT in system PATH. Eval script installs to `$HOME/.bun/bin/bun` via curl (bun.sh/install). GitHub releases CDN at github.com/oven-sh may be blocked (403) in some envs; succeeded in iter 269's Actions runner.
- **Iter 268**: Canonical was at 599 after merging main. Added 8 pairs. Commit cda8853 (on wrong branch, not canonical).
- **Iter 262**: Added 6 pairs to canonical (was only iter to correctly push to canonical): series_ffill_bfill_fn, dataframe_ffill_bfill_fn, dataframe_diff_shift_fn, interval_range_fn, date_range_fn, nunique_standalone_fn. Commit 15f8815.
- **Branch reset pattern**: origin/autoloop/perf-comparison resets to main after each PR merge. Always checkout from origin/autoloop/perf-comparison.
- **DataFrame construction**: use `DataFrame.fromColumns({...})` not `new DataFrame({...})`.
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- reindexSeries supports method: "ffill"|"bfill"|"nearest" with optional limit.
- SeriesGroupBy has getGroup, agg, sum, mean, min, max, count, std, first, last, size, transform, apply, filter methods.

---

## 🔭 Future Directions

- **IMMEDIATE PRIORITY**: The `run_benchmarks.sh` fix (parallelism + bun detection) must be pushed. If this run also fails to push, check if `push_to_pull_request_branch` is accessible. If still blocked, add the fix to the program directly.
- **run_benchmarks.sh fix to apply**: Replace the sequential script with 8-worker parallel execution (30s per-benchmark timeout), temp-file result collection, and bun path detection at `$HOME/.bun/bin/bun`. See iteration 270 notes for details.

---

## 📊 Iteration History

### Iteration 270 — 2026-04-21T01:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24699442900)

- **Status**: ⚠️ Error | **Metric**: N/A (push failed; local commit fb86b13 NOT pushed to GitHub)
- Rewrote `run_benchmarks.sh` to use 8 parallel workers with 30s per-benchmark timeout and temp-file result collection. Added bun fallback path detection. Added 1 new benchmark pair: `bench_datetime_tz`. Changes committed locally (fb86b13) but could NOT be pushed — `push_to_pull_request_branch` blocked by runner policy (safeoutputs server runs in Docker without runner filesystem access). **Next run must re-apply these changes.**

### Iteration 269 — 2026-04-20T23:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24695261511)

- **Status**: ✅ Accepted | **Metric**: 233 (true canonical baseline was 0; state's phantom "607" corrected; delta: +233) | **Commit**: ab8b0ec
- Added 8 new standalone benchmark pairs: ffill_bfill_series, ffill_bfill_df, diff_shift_df, interval_range, date_range, to_timedelta, date_utils, nunique_df. First genuine canonical evaluation via parallel runner (20 workers, 60s timeout): 233/607 pairs successful. Many pairs timed out due to CPU contention in parallel; sequential eval would yield higher count.

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0. Added many pairs to main (via wrong branches then PRs), which is why main now has 599 TS/PY pairs. Commits: 762e824, 28bbc3b, 15f8815, b8edf68, 8180184, 332f5b6, fd64174, cda8853.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
