# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-19T23:14:00Z |
| Iteration Count | 242 |
| Best Metric | 589 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #150 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | local-only, local-only, local-only, local-only, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: #150
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Canonical baseline after merge is 534** (PR #148 → main). Iters 238-241 failed push; iter 242 succeeded.
- **All src functions now benchmarked**: Only 3 exported functions were not imported in any benchmark (dataFrameAbs, dataFrameRound, unstack) — all standalone-fn variants of method-based benchmarks. Added in iter 242.
- **Cherry-pick strategy**: When tools are available, cherry-pick all commits from `origin/autoloop/perf-comparison-8724e9f9` (10 commits, 50 pairs) first, then add new pairs.
- **CRITICAL**: Use `autoloop/perf-comparison` (PR #150). Metric = min(ts_bench_count, py_bench_count).
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- reindexSeries/reindexDataFrame support method: "ffill"|"bfill"|"nearest" with optional limit.
- shiftSeries/diffSeries are standalone exports.

---

## 🔭 Future Directions

- **All 3 remaining uncovered standalone functions now benchmarked** (dataFrameAbs, dataFrameRound, unstack standalone fn variants).
- Future iterations should focus on NEW benchmark scenarios: different data types, larger/smaller datasets, edge cases with NaN/null values, or new parameter combinations.
- Consider benchmarking "real-world" multi-step pipelines: groupby → agg → merge → reshape workflows.
- Consider benchmarking DataFrame operations on wider DataFrames (e.g., 100+ columns) vs narrow ones.
- Benchmark performance at different data scales (10k, 100k, 1M rows) for key functions.

---

## 📊 Iteration History

### Iteration 242 — 2026-04-19 23:14 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24641474300)

- **Status**: ✅ Accepted | **Metric**: 589 (previous best: 534, delta: +55) | **Commit**: c6febb4
- Cherry-picked all 10 commits from `origin/autoloop/perf-comparison-8724e9f9` (50 pairs). Added 5 new pairs: dataframe_abs_fn (dataFrameAbs standalone), dataframe_round_fn (dataFrameRound standalone), unstack_fn (unstack standalone), series_numeric_pipeline (abs→round→clip chain), dataframe_numeric_pipeline (abs→round→sign chain). All 3 uncovered standalone functions now benchmarked. 534→589.

### Iteration 241 — 2026-04-19 22:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24640973979)

- **Status**: ⚠️ Local Only | **Metric**: 587 (previous best: 534, delta: +53) | **Commit**: 2e27cdb (local only)
- Merged main into branch. Cherry-picked all 10 commits from `origin/autoloop/perf-comparison-8724e9f9` adding 50 previously-stranded pairs. Added 3 new: series_abs_fn, dataframe_abs_fn, dataframe_round_fn. Metric 534→587. Push failed: safeoutputs push_to_pull_request_branch not available in this run context.

### Iteration 240 — 2026-04-19 22:11 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24640330783)

- **Status**: ⚠️ Local Only | **Metric**: 539 (previous best: 534, delta: +5) | **Commit**: ed00b89 (local only)
- Added 5 standalone fn benchmark pairs: series_abs_fn (seriesAbs), dataframe_abs_fn (dataFrameAbs), dataframe_round_fn (dataFrameRound with decimals), combine_first_series_fn (combineFirstSeries), dataframe_rolling_apply_fn (dataFrameRollingApply). Merged origin/main (534) first. Push failed: safeoutputs push_to_pull_request_branch not available in this run context.

### Iteration 239 — 2026-04-19 21:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24639861090)

- **Status**: ⚠️ Local Only | **Metric**: 539 (previous best: 534, delta: +5) | **Commit**: 87fffe5 (local only)
- Added 5 standalone fn benchmark pairs: combine_first_series_fn (combineFirstSeries), dataframe_round_fn (dataFrameRound), dataframe_abs_fn (dataFrameAbs), dataframe_rolling_apply_fn (dataFrameRollingApply), series_abs_fn (seriesAbs). Push failed: safeoutputs push_to_pull_request_branch not available in this run context.

### Iteration 238 — 2026-04-19 21:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24639238734)

- **Status**: ⚠️ Local Only | **Metric**: 539 (previous best: 534 from main baseline, delta: +5) | **Commit**: 0ed2d1b (local only)
- Added 5 new pairs: combine_first_series_fn (combineFirstSeries), dataframe_round_fn (dataFrameRound), dataframe_abs_fn (dataFrameAbs), dataframe_rolling_apply_fn (dataFrameRollingApply standalone), to_numeric_array (toNumericArray). Metric: 534→539. Push failed: safeoutputs tools not available in this run context.

### Iters 232–237 — ⚠️ Local Only | metrics up to 589 (not pushed due to safeoutputs unavailability)
- Cherry-picked all 76 benchmark pairs from `origin/autoloop/perf-comparison-8724e9f9` that were missing from canonical branch (which had 508): applySeries_fn, astype_df_fn, cat_ops variants, categorical_index_modify, clip variants, combine_first variants, concat_series_axis0, crosstab_normalize, cummax_cummin_str, cumops_skipna, dataframe_* variants, date_offset_hour_second, digitize_fn, dropna_thresh_subset, explode_dataframe, fillna_col_map, get_dummies_drop_first, groupby variants, histogram_bin_edges, insert_pop, interpolate variants, is_named_agg_spec, isin_series_fn, json_normalize_meta, melt_id_vars, merge_sort, named_agg_class, nan stats, nancumops_extra, natsort/ops, nlargest_dataframe, numeric_stats_ext, pct_change variants, pipe_fn, pivot_fn, pivot_table variants, qcut_interval_index, read_json_all_orients, reindex_fill_methods, sample variants, select_dtypes_options, series_* variants, shift_series_fn, stack_options, str_contains/split, to_numeric variants, wide_to_long_sep_suffix. Total 508→584. Push failed: push_to_pull_request_branch safeoutputs tool not available in this run context. Next iteration should retry push.

### Iters 215–241 — ⚠️ Local Only | metrics up to 587 (all push failures due to safeoutputs unavailability; iter 234 ✅ pushed 540, iter 231 ✅ pushed 540)
- Cherry-picked from non-canonical branch origin/autoloop/perf-comparison-8724e9f9. Multiple iterations tried but could not push until iter 242.

### Iters 163–214 — ✅/⚠️ mix | metrics 508→534 on canonical branch. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline + all major functions benchmarked.
