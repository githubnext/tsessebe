# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-22T08:37:55Z |
| Iteration Count | 280 |
| Best Metric | 639 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — (pending creation from iter 280) |
| Steering Issue | #131 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, error, accepted, accepted, error, error, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: — (pending creation from iter 280)
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Iter 280**: Merge main (633 pairs) into canonical branch (was at 508) + 6 new pairs. Result: 639 on canonical branch.
- **Key insight**: Previous iters 277-279 updated state file best_metric (638) but committed to suffixed/wrong branches. The canonical `autoloop/perf-comparison` was still at 508.
- **Iter 279**: Merge main (+125 pairs) + 5 new pairs (diffSeries/shiftSeries options, dataFrameFfill axis=1, any/all skipna, nunique). Result: 638.
- **Iter 278**: Fixed 300+ API bugs (wrong names, method→standalone, rollingQuantile args, fromDictOriented). pgid kill. Result: 532.
- **subprocess timeout**: `Popen` + `start_new_session=True`, then `os.killpg(pgid, SIGKILL)`.
- **Import paths**: `../../src/index.ts` not `"tsb"`. Series: `new Series({ data: [...] })`. DF: `DataFrame.fromColumns({...})`.
- **Standalones**: cummax/cummin/cumprod/cumsum/diff/explode/pct_change/seriesAbs/where/mask/sample/replace/astype/pivot.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Old sequential approach is too slow for 508 pairs. Use parallel Python runner.
- **SSH push**: SSH to github.com is blocked in this runner environment.
- **HTTPS push without credentials**: git credential helper not configured; git push hangs waiting for input. Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- **Add more benchmarks** (639 pairs, canonical branch up to date):
  1. Continue adding benchmarks for new functions as tsb library grows
  2. Look for any remaining options-API variants not yet benchmarked
  3. Check for any new src/ modules added since iteration 280

---

## 📊 Iteration History

### Iteration 280 — 2026-04-22T08:37 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24768692351)

- **Status**: ✅ Accepted
- **Change**: Merge main (633 pairs) into canonical branch + 6 new pairs (ffill axis=1, any/all skipna=false, shift fillValue, diff periods, nunique dropna=false, df any/all boolOnly)
- **Metric**: 639 (previous best: 638, delta: +1)
- **Commit**: 7b525fe
- **Notes**: Canonical branch was at 508 (iter 158). After merging main (633) + 6 new: 639. Previous state best_metric 638 was achieved on wrong/suffixed branches. This is the first 639+ on the canonical branch.

- **Status**: ✅ Accepted
- **Change**: Merge main (125 new pairs from merged suffixed-branch work) + 5 new benchmark pairs for options-API functions
- **Metric**: 638 (previous best: 532, delta: +106)
- **Commit**: e6fda81
- **Notes**: The 125 pair jump came from merging main which had iters 277/278 fixes merged via suffixed branches. New pairs target diffSeries/shiftSeries options API, dataFrameFfill axis=1, any/all skipna, nunique reduce_ops.

### Iteration 278 — 2026-04-21T19:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24728467447)

- **Status**: ✅ Accepted
- **Change**: Fix 300+ benchmark API bugs: wrong export names, method→standalone function, fromColumns Map pattern, rollingQuantile args, fromDictOriented API; fix parallel runner pgid timeout kill
- **Metric**: 532 (previous best: 382, delta: +150)
- **Commit**: cd7ab18
- **Notes**: Fixed ~35 additional benchmarks beyond the 495 mid-run count, reaching 532/631 pairs. Main remaining issues: expanding/rolling timeouts, df.median()/df.round() not methods.

### Iteration 277 — 2026-04-21T14:17 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24722137337)

- **Status**: ✅ Accepted
- **Change**: Fix benchmark constructors (Series/DataFrame), import paths, cummax/cummin standalone; add parallel Python runner with process-group kill; install pandas
- **Metric**: 382 (previous best: 0 canonical, delta: +382)
- **Commit**: b95658d
- **Notes**: Huge improvement from 0→382. Root causes were: pandas not installed (2→11 pairs), wrong Series/DataFrame constructors (142 files), wrong import paths (42 files).

### Iters 269–276 — ⚠️ error/wrong-branch | metrics 233-312 but all on suffixed branches or local-only, canonical was 0.

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
