# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-19T22:46:00Z |
| Iteration Count | 241 |
| Best Metric | 534 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #150 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | local-only, local-only, local-only, local-only, local-only, accepted, accepted, accepted, accepted, accepted |

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

- **Canonical baseline after merge is 534** (PR #148 → main). Iters 238-241 tried but push failed due to safeoutputs unavailability. When tools ARE available, cherry-pick all 10 commits from `origin/autoloop/perf-comparison-8724e9f9` plus 3 new standalone fn pairs = 587 total.
- **push_to_pull_request_branch is NOT available in most run contexts.** Iters 238-241 all failed. When available (iter 231, 234), push works successfully. State remains at 534 canonical.
- **Ready-to-push commits**: Local branch `autoloop/perf-comparison` at commit 2e27cdb has 587 pairs (11 new commits ahead of origin). Next run with tools available should push.
- **CRITICAL**: Use `autoloop/perf-comparison` (PR #150). Metric = min(ts_bench_count, py_bench_count).
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- reindexSeries/reindexDataFrame support method: "ffill"|"bfill"|"nearest" with optional limit.
- shiftSeries/diffSeries are standalone exports.

---

## 🔭 Future Directions

- **URGENT for next run**: Local branch `autoloop/perf-comparison` at commit 2e27cdb has 587 benchmark pairs (11 commits ahead of origin, which is at 508). If safeoutputs tools are available next run, simply push. If not, re-create by checking out from origin/main (534) and cherry-picking these commits in order: 6609544 f700047 7178c40 1cab883 5dd1667 76543d2 3fb6645 2ae0f9c 2d66429 cfe7b1d 2e27cdb (all from origin/autoloop/perf-comparison-8724e9f9 except last 3 new files).
- Local branch has 587 pairs ready to push. Next run with safeoutputs tools available should push these directly without re-creating: checkout autoloop/perf-comparison locally and push.

---

## 📊 Iteration History

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
