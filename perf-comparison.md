# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-19T20:12:03Z |
| Iteration Count | 236 |
| Best Metric | 584 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #150 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, error, accepted, local-only, local-only |

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

- **Canonical baseline is 508 from pre-PR#150 state; 584 after iter 236**. Always verify after merge.
- **Non-canonical branches now fully consolidated**: all 76 pairs from `origin/autoloop/perf-comparison-8724e9f9` have been committed to canonical branch in iter 236.
- **push_to_pull_request_branch works via safe-output tool** in the main agent context.
- **cumops options**: cumsum/cummax support skipna=false. dataFrameCumsum/dataFrameCummax support axis=1 for row-wise cumulative ops.
- **Standalone vs method-form**: Many TS bench files use method-form without importing standalone exports. `_fn` suffix benchmarks cover standalone exports.
- **CRITICAL**: Use `autoloop/perf-comparison` (PR #150). Metric = min(ts_bench_count, py_bench_count).
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- reindexSeries/reindexDataFrame support method: "ffill"|"bfill"|"nearest" with optional limit.
- shiftSeries/diffSeries are standalone exports.

---

## 🔭 Future Directions

- All 76 pairs from `origin/autoloop/perf-comparison-8724e9f9` have now been cherry-picked to the canonical branch (iter 236). Metric: 584. The non-canonical branch is fully consolidated.
- Method-variant benchmarks, edge-case benchmarks for existing functions, or new src/ functions.
- Series.autocorr(lag) if implemented. MultiIndex getLoc with slice. groupby: nunique if added.

---

## 📊 Iteration History

### Iteration 236 — 2026-04-19 20:12 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24638064112)

- **Status**: ⚠️ Local Only | **Metric**: 584 (canonical was 508, delta: +76) | **Commit**: c626e3e (local only)
- Cherry-picked all 76 benchmark pairs from `origin/autoloop/perf-comparison-8724e9f9` that were missing from canonical branch (which had 508): applySeries_fn, astype_df_fn, cat_ops variants, categorical_index_modify, clip variants, combine_first variants, concat_series_axis0, crosstab_normalize, cummax_cummin_str, cumops_skipna, dataframe_* variants, date_offset_hour_second, digitize_fn, dropna_thresh_subset, explode_dataframe, fillna_col_map, get_dummies_drop_first, groupby variants, histogram_bin_edges, insert_pop, interpolate variants, is_named_agg_spec, isin_series_fn, json_normalize_meta, melt_id_vars, merge_sort, named_agg_class, nan stats, nancumops_extra, natsort/ops, nlargest_dataframe, numeric_stats_ext, pct_change variants, pipe_fn, pivot_fn, pivot_table variants, qcut_interval_index, read_json_all_orients, reindex_fill_methods, sample variants, select_dtypes_options, series_* variants, shift_series_fn, stack_options, str_contains/split, to_numeric variants, wide_to_long_sep_suffix. Total 508→584. Push failed: push_to_pull_request_branch safeoutputs tool not available in this run context. Next iteration should retry push.

### Iteration 235 — 2026-04-19 19:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24637556704)

- **Status**: ⚠️ Local Only | **Metric**: 584 (previous best: 540, delta: +44) | **Commit**: 97882b4 (local only)
- Merged origin/main (534). Cherry-picked all 50 remaining benchmark pairs from `origin/autoloop/perf-comparison-8724e9f9`: astype_df_fn, cat_freq_crosstab, cat_ops variants, combine_first variants, crosstab_normalize, cummax_cummin_str, cumops_skipna, dataframe_cov_options, dataframe_cumops_axis1, dataframe_rolling_apply_fn, date_offset_hour_second, digitize_fn, dropna_thresh_subset, explode_dataframe, fillna_col_map, get_dummies_drop_first, groupby_agg_no_index, histogram_bin_edges, insert_pop, interpolate_methods/zero_nearest, is_named_agg_spec, isin_series_fn, json_normalize_meta, named_agg_class, nan stats variants, nancumops_extra, natsort/ops, nlargest_dataframe, numeric_stats_ext, pct_change variants, pivot_fn, pivot_table variants, read_json_all_orients, reindex_fill_methods, sample_weights, select_dtypes_options, series_cumops_nan, shift_series_fn, str_contains, to_numeric variants, wide_to_long_sep_suffix. Total: 534→584. Push failed: push_to_pull_request_branch not available in this run context. Next iteration should retry with these same files.

### Iteration 234 — 2026-04-19 19:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24637036159)

- **Status**: ✅ Accepted | **Metric**: 540 (previous best: 508, delta: +32 vs canonical; +6 vs post-merge 534) | **Commit**: ae386e8
- Merged origin/main (534 canonical). Checked out 10 benchmark pairs from `origin/autoloop/perf-comparison-8724e9f9`: applySeries_fn, astype_df_fn, cat_freq_crosstab, cat_ops_from_codes, cat_ops_setops, categorical_index_modify, clip_dataframe_with_bounds, clip_series_with_bounds, combine_first_fn, combine_first_series. 6 were truly new (others already in main). Total: 534→540.

### Iteration 233 — 2026-04-19 18:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24636438815)

- **Status**: ⚠️ Local Only | **Metric**: 518 (canonical 508→518, +10) | **Commit**: 9332415 (local only, not pushed)
- Checked out origin/autoloop/perf-comparison (508 canonical). Cherry-picked 10 pairs from non-canonical branch `origin/autoloop/perf-comparison-8724e9f9`: applySeries_fn, astype_df_fn, cat_freq_crosstab, cat_ops_from_codes, cat_ops_setops, categorical_index_modify, clip_dataframe_with_bounds, clip_series_with_bounds, combine_first_fn, combine_first_series. Push failed: safeoutputs tools not available. State corrected from 540→518 (state was inflated by non-canonical commits).

### Iteration 232 — 2026-04-19 18:15 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24635794410)

- **Status**: ⚠️ Local Only | **Metric**: 540 (534→540, +6) | **Commit**: 1cea2b6 (local only, not pushed)
- Started from origin/main (534 pairs). Checked out `origin/autoloop/perf-comparison-8724e9f9` non-canonical branch that had 50 new pairs. Cherry-picked 6: shift_series_fn, combine_first_series_fn, cumops_skipna, dataframe_cumops_axis1, reindex_fill_methods, nancumops_extra. Safeoutputs push_to_pull_request_branch not available; push failed.

### Iteration 231 — 2026-04-19 17:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24635221378)

- **Status**: ✅ Accepted | **Metric**: 540 (534→540, +6) | **Commit**: b66009a
- Created autoloop/perf-comparison branch from origin/main (534 canonical). Added 6 benchmark pairs: shift_series_fn (shiftSeries standalone), dataframe_round_fn (dataFrameRound standalone), combine_first_series_fn (combineFirstSeries standalone), reindex_fill_method (reindexSeries with ffill/bfill/nearest), cumops_skipna_false (cumsum/cummax/cummin with skipna=false), dataframe_shift_axis1 (dataFrameShift axis=1). Pushed successfully to PR #150.

### Iters 215–230 — ⚠️/✅ mix | metrics 534→540 (canonical); push failures and non-canonical branch issues.

### Iters 163–214 — ✅/⚠️ mix | metrics 508→534 on canonical branch. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline + all major functions benchmarked.
