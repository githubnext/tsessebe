# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-30T07:09:31Z |
| Iteration Count | 299 |
| Best Metric | 637 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, error, accepted, error, error, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Import paths**: `../../src/index.ts`. Series: `new Series({ data: [...] })`. DF: `DataFrame.fromColumns({...})`.
- **Standalones**: cummax/cummin/cumprod/cumsum/diff/explode/pct_change/seriesAbs/where/mask/sample/replace/astype/pivot.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: mergeAsof(left, right, { on: "key", direction: "backward"|"forward"|"nearest" }) — DFs must be sorted.
- **crossJoin**: crossJoin(left, right) — small DFs only (100×100 safe).
- **string_accessor**: available as `series.str.lower()`, `.strip()`, `.len()`, `.replace(pat, repl)`, `.split(sep)`.
- **insert_pop**: exported as `insertColumn(df, loc, col, values)` and `popColumn(df, col)`.
- **natsort**: exported as `natSorted(arr)` from src/index.ts.

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Too slow for 500+ pairs. Use parallel Python runner.
- **SSH push** and **HTTPS push without credentials**: blocked. Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- Continue adding option-variant benchmarks (axis/limit/method parameters)
- Check for new src/ modules added to tsb library
- More string_accessor variants: startswith, endswith, findall, extract

---

## 📊 Iteration History

### Iteration 299 — 2026-04-30T07:09:31Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25152235433)

- **Status**: ✅ Accepted · **Change**: Added 4 benchmark pairs: `truncate` (Series.truncate by index bounds), `filter_labels` (DataFrame.filter by items), `assign` (dataFrameAssign with callable), `transform_agg` (seriesTransform "mean"). **Metric**: 637 (previous best: 636, delta: +1). Commit 5f069ec.

### Iteration 298 — 2026-04-29T19:22:43Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25129063173)

- **Status**: ✅ Accepted · **Change**: Added benchmark pairs for `assign` (dataFrameAssign with callables), `pipe_apply` (pipe + seriesApply + dataFrameApplyMap), and `to_from_dict` (toDictOriented/fromDictOriented round-trip). **Metric**: 636 (previous best: 635, delta: +1). Commit db58c02.

### Iteration 297 — 2026-04-29T07:38:52Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25096656047)

- **Status**: ✅ Accepted · **Change**: Added benchmark pairs for `corrwith` (DataFrame.corrwith vs Series) and `autocorr` (lag-1 autocorrelation). **Metric**: 635 (previous best: 634, delta: +1). Commit a7f95b0.

### Iteration 296 — 2026-04-28T07:12:13Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25039058101)

- **Status**: ✅ Accepted · **Change**: Added benchmark pair for `compare` (seriesEq, seriesLt, dataFrameEq). **Metric**: 634 (delta: +1). Commit 70e115e.

### Iters 1–295 — ✅/⚠️ | Metrics 0→633. See git history on autoloop/perf-comparison branch.
