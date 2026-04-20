# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-20T15:33:22Z |
| Iteration Count | 258 |
| Best Metric | 604 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: —
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Iter 258**: Best metric is 604. Added 5 pairs: dataframe_ffill_bfill (dataFrameFfill/dataFrameBfill), series_ffill_bfill (ffillSeries/bfillSeries), dataframe_diff_shift (diffDataFrame/shiftDataFrame), interval_range (intervalRange), date_range_fn (dateRange standalone). Commit 762e824.
- **Iter 257**: Best metric is 543. Added 9 pairs: shift_series_fn, reindex_fill, sample_weighted, combine_first_series, dataframe_abs_round_fn, dataframe_rolling_apply_fn, all_any_ops, astype_dataframe_fn, series_groupby_getgroup. Commit b1552de.
- **Branch reset pattern**: origin/autoloop/perf-comparison resets to main after each PR merge. Always checkout from origin/main.
- **Standalone vs method APIs**: Many functions have both forms. Remaining unbenchmarked standalone: scan src/ for functions not imported in any benchmarks/tsb/*.ts.
- **DataFrame construction**: use `DataFrame.fromColumns({...})` not `new DataFrame({...})`.
- **CRITICAL**: Use `autoloop/perf-comparison` (PR #150). Metric = min(ts_bench_count, py_bench_count).
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- reindexSeries supports method: "ffill"|"bfill"|"nearest" with optional limit.
- SeriesGroupBy has getGroup, agg, sum, mean, min, max, count, std, first, last, size, transform, apply, filter methods.

---

## 🔭 Future Directions

- Continue adding benchmark pairs for remaining unbenchmarked functions (many still available).
- Look for functions in src/ not yet tested: more str* variants, more groupby/window variants, etc.

---

## 📊 Iteration History

### Iteration 258 — 2026-04-20 15:33 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24675283159)

- **Status**: ✅ Accepted | **Metric**: 604 (previous best: 543, delta: +61) | **Commit**: 762e824
- Added 5 new benchmark pairs: dataframe_ffill_bfill (dataFrameFfill/dataFrameBfill), series_ffill_bfill (ffillSeries/bfillSeries), dataframe_diff_shift (diffDataFrame/shiftDataFrame), interval_range (intervalRange), date_range_fn (dateRange standalone function).

### Iteration 257 — 2026-04-20 14:37 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24672518880)

- **Status**: ✅ Accepted | **Metric**: 543 (previous best: 541, delta: +2) | **Commit**: b1552de
- Added 9 new benchmark pairs: shift_series_fn (shiftSeries standalone), reindex_fill (reindexSeries w/ ffill/bfill), sample_weighted (sampleDataFrame w/ weights), combine_first_series (combineFirstSeries standalone), dataframe_abs_round_fn (dataFrameAbs/Round standalone), dataframe_rolling_apply_fn (dataFrameRollingApply standalone), all_any_ops (anyDataFrame/allDataFrame axis=0), astype_dataframe_fn (astype(df, singleDtype)), series_groupby_getgroup (SeriesGroupBy.getGroup).

### Iters 252–256 — ✅/⚠️ mix | metrics 534→541. Previous branch work (not in main, re-done here).

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
