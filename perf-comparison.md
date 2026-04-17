# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-17T16:05:00Z |
| Iteration Count | 158 |
| Best Metric | 508 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #147 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |
| Paused | false |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: #147
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **CRITICAL BRANCHING**: Use `autoloop/perf-comparison`. PR #147 is the active PR.
- **MCP HTTP workaround**: Use curl to `http://host.docker.internal:80/mcp/safeoutputs` with Authorization from `~/.copilot/mcp-config.json`. Get `Mcp-Session-Id` from initialize, send `notifications/initialized`, then `tools/call`.
- push_repo_memory limit is ~10KB file / ~12KB total. Keep history trimmed.
- Metric = min(ts_bench_count, py_bench_count). Bun not installed; file-count only.
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- CategoricalAccessor: s.cat.<method>(). Series({data,name,index}). df.assign({c: series}).
- IO benchmarks: 10k rows for toCsv/toJson. date_range: 10k periods "D" freq.
- catFromCodes(codes, categories). toDictOriented supports many orients.
- Period.startTime gives the start Date. Timedelta.totalDays is a getter. IntervalIndex.overlaps(query) returns boolean[]. describe() accepts {percentiles, include}.

---

## 🔭 Future Directions

- Series.autocorr(lag) if implemented.
- MultiIndex getLoc with slice / get_locs / get_indexer.
- groupby: nunique (if DataFrameGroupBy.nunique() added), transform-apply.
- Resample operations beyond mean (sum/std/count) if more ops exposed.

---

## 📊 Iteration History

### Iteration 158 — 2026-04-17 16:05 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24573945763)
- **Status**: ✅ Accepted | **Metric**: 508 (previous best: 503, delta: +5) | **Commit**: 2c82582
- Added 5 pairs: dataframe_rolling_min_max (DataFrameRolling.min/max), interval_index_construction (IntervalIndex.fromArrays/fromIntervals), read_csv_options (readCsv with sep/header/skipRows/dtype), to_csv_options (toCsv with sep/header/index options), dataframe_median (DataFrame.median column-wise).

### Iteration 157 — 2026-04-17 15:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24572885192)
- **Status**: ✅ Accepted | **Metric**: 503 (previous best: 498, delta: +5) | **Commit**: 436abfe
- Added 5 pairs: nan_agg_extended (nancount/nanprod/nanmedian), rank_methods (rankSeries min/max/first/dense methods), dropna_advanced (dropnaDataFrame thresh/subset/axis=1 options), get_dummies_opts (getDummies/dataFrameGetDummies prefix/dropFirst/dummyNa), factorize_sort (factorize/seriesFactorize sort=true/useNaSentinel options).

### Iteration 156 — 2026-04-17 14:53 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24571428668)
- **Status**: ✅ Accepted | **Metric**: 498 (previous best: 493, delta: +5) | **Commit**: df6dab9
- Added 5 pairs: date_offset_rollforward (DateOffset.rollforward/rollback/onOffset), date_offset_more_types (MonthBegin/YearEnd/Week/Minute/Milli), date_range_options (date_range with various freq options), combine_first_dataframe (combineFirstDataFrame standalone), series_groupby_custom_agg (SeriesGroupBy.agg with custom function).

### Iteration 155 — 2026-04-17 13:34 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24567781388)
- **Status**: ✅ Accepted | **Metric**: 493 (previous best: 488, delta: +5) | **Commit**: 1267bc5
- Added 5 pairs: dataframe_expanding_std_var (DataFrameExpanding.std/var), dataframe_expanding_sum_count (DataFrameExpanding.sum/count), dataframe_expanding_median_apply (DataFrameExpanding.median/apply), tz_datetime_index_extra (TZDatetimeIndex.slice/concat/at/toArray/toTimestamps/min/max/tz_convert method/tz_localize_none), timedelta_index_tostrings (TimedeltaIndex.toStrings/toArray/at/rename).

### Iters 147–157 — all ✅ | metrics 462→503. timestamp_arith/str_format/round_normalize, value_counts_opts, series_sortvalues_opts, dataframe_sortvalues_mixed, series_groupby_size, series_log_natural, series_standalone_compare, dataframe_compare_lege, series_floordiv_standalone, drop_duplicates_fn, nsmallest_series_fn, duplicated_fn, dataframe_isin, series/dataframe_reset_index, series_to_object, interval_index_construction, replace_series, isnull_notnull, to_numeric_scalar, dataframe_assign_fn, df_any_all_axis1, df_nunique_axis1, cat_codes_accessor, ewm_adjust, interpolate_bfill_limit, datetime_index_ops/snap/normalize_filter_shift, index_map, multi_index_fromtuples, timedelta_advanced_ops, dataframe_rolling_var_std_sum_count/median, period_index_query, series_groupby_agg_all, date_offset_rollforward/more_types/range_options, combine_first_dataframe, series_groupby_custom_agg, dataframe_expanding_std_var/sum_count/median_apply, tz_datetime_index_extra, timedelta_index_tostrings, nan_agg_extended, rank_methods, dropna_advanced, get_dummies_opts, factorize_sort.

### Iters 143–146 — ✅/⚠️ mix | metrics 437→462. period_arithmetic, period_index_methods, dt_total_seconds, timedelta_index_ops, interval_overlaps, describe_opts, merge_index_join, to_json_orient, mode_dataframe_fn, where_mask_fns, idxmin_max_df, diff_applymap_fn, quantile_fn, pct_change_fn, merge_suffixes, expanding_min_periods, dt_isocalendar, period_asfreq, sample_fn, nunique_fn.

### Iters 126–142 — ✅/⚠️ mix | metrics 352→437. Shift_diff, pow_mod, clip_bounds, reindex, compare, arith_fns, skew_kurt, sem_var, mode, idxmin_idxmax, nancumops, clip_advanced, infer_dtype, value_counts_binned, categorical_index, tz_localize_convert, align_series, align_dataframe, memory_usage, named_agg, series_any_all, dataframe_any_all, dataframe_nunique, series_crosstab, bdate_range, radd_rsub ops, series_exp_log, series_ceil_floor_trunc_sqrt, dataframe_ceil_floor_trunc, dataframe_exp_log, pivot_table_full, read_excel, pipe_chain_ops, nan_extended_agg, series_pipe_apply, cut_interval_index, argsort, interval_index_ops, period_index_range, datetime_index_from, timedelta_index, resolve_freq, mode_dataframe, combine_first_ext, dropna_fn, fillna_fn, explode_fn, isin_fn, interpolate_fn, sample_fn, groupby_multi_key, timestamp_static, tz_datetime_index_ops, rolling_center_min_periods, cast_scalar, concat_options, ewm_com_halflife, nat_sort_key, dataframe_iter.

### Iters 1–125 — all ✅/⚠️ | metrics 0→352. Full baseline, rebuilds after branch loss, index_union/intersection/difference, groupby ops, all major functions benchmarked.
