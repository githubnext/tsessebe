# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-22T02:19:30Z |
| Iteration Count | 279 |
| Best Metric | 638 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Steering Issue | #131 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, error, error, accepted, accepted, error, error, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: — (new PR from iteration 279, pending CI)
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Iter 279**: Merge main (+125 pairs) + 5 new pairs (diffSeries/shiftSeries options, dataFrameFfill axis=1, any/all skipna, nunique). Result: 638.
- **Iter 278**: Fixed 300+ API bugs (wrong names, method→standalone, rollingQuantile args, fromDictOriented). pgid kill. Result: 532.
- **subprocess timeout**: `Popen` + `start_new_session=True`, then `os.killpg(pgid, SIGKILL)`.
- **Iter 277**: Fixed constructors (142 files), import paths, cummax/cummin standalone, installed pandas. Result: 382.
- **Import paths**: `../../src/index.ts` not `"tsb"`. Series: `new Series({ data: [...] })`. DF: `DataFrame.fromColumns({...})`.
- **Standalones**: cummax/cummin/cumprod/cumsum/diff/explode/pct_change/seriesAbs/where/mask/sample/replace/astype/pivot.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **whereDataFrame cond**: function or boolean DataFrame. **rollingQuantile**: `(series, q, window)`. **fromDictOriented orient**: "columns"|"index"|"split"|"tight".
## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Old sequential approach is too slow for 508 pairs. Use parallel Python runner.
- **SSH push**: SSH to github.com is blocked in this runner environment.
- **HTTPS push without credentials**: git credential helper not configured; git push hangs waiting for input. Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- **Fix remaining pairs** (638/638 files, but CI run quality unknown):
  1. Previous issues with timeouts (concat_axis1, expanding/rolling) may be resolved in merged main
  2. Continue adding benchmarks for new functions as tsb library grows
  3. DataFrame.median() and df.round() standalone functions — add if library adds them

---

## 📊 Iteration History

### Iteration 279 — 2026-04-22T02:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24756754833)

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
