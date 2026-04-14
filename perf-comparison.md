# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-14T21:19:35Z |
| Iteration Count | 79 |
| Best Metric | 251 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #141 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | safeoutputs MCP server unavailable for 4 consecutive iterations (76–79); push_to_pull_request_branch not callable |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 4 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, error, error, error |
| Paused | true |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: #141
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- Metric = min(ts_bench_count, py_bench_count); start from main, union 3c596789 branch (actual 251 pairs despite commit saying 265) + add new pairs.
- Bun not installed; TS benchmark files validated by file-count metric only.
- push_repo_memory limit ~10KB total; compress iteration history when needed.
- API notes: seriesRound, s.dt.year() is method; groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only; rollingApply(s, window, fn); Series({data,name,index}); df.assign({c: series}) direct.
- Index has: delete(), drop(), equals(), identical(), argsort(), isna(), dropna(), min(), max(), argmin(), argmax(), insert(), nunique(), fillna(), append(), rename().
- String accessor has: fullmatch(), lower(), upper(), title(), capitalize(), swapcase(), find(), rfind(), repeat(), isalpha(), isdigit(), isalnum(), isnumeric(), islower(), isupper(), istitle(), isspace(), zfill(), center(), ljust(), rjust(), slice(), count().
- DatetimeAccessor has: is_year_start(), is_year_end(), is_leap_year(), days_in_month(), is_month_start(), is_month_end(), hour(), minute(), second().
- Branching pattern: checkout 3c596789 branch as canonical autoloop/perf-comparison, add pairs, commit, push via push_to_pull_request_branch to PR #141.
- All iter 46–69 pairs accepted (except 66 error); 3c596789 has 172 pairs initially, main has 51. Pipeline: branch from 3c596789 → merge main (234 after conflict resolution) → add new pairs → commit.
- groupby.first()/last() on both GroupBy types; dataFrameCummin/Cumprod exported; EWM.corr takes EwmSeriesLike.
- Iter 68: 234 pairs achieved (+4 vs iter 67). Branched from 3c596789 (172) + merge main (186) + 48 new: series_median/min_max/sum_mean/unique/corr/std_var/filter/count/toobject/resetindex/isin/quantile/sort_index/loc/iloc/describe/copy/rename/dropna/isna_notna/groupby, dataframe_set_index/sort_index/iloc/loc/drop/resetindex/count/sum_mean/assign/select/to_array/to_records/to_dict/fillna/isna/notna/min_max/std_var/describe, concat_axis1, merge_left/right/outer/inner, ewm_corr, groupby_median, groupby_std_df. Commit: b728240
- Iter 69: 241 pairs (+7 vs 234). Added: expanding_min/max/count/median, series_compare (eq/ne/lt/gt/le/ge), index_ops (union/intersection/difference), dataframe_rank. Merge from main brings in 14 extra pairs and requires conflict resolution (use `git checkout --ours`). Commit: 1508581

---

## 🔭 Future Directions

- More groupby aggregation variants (nunique — check if API exists).
- Series/DataFrame accessor benchmarks (str on DataFrame columns).
- IO benchmarks: read_parquet, to_parquet, read_excel.
- Advanced reshape: crosstab with margins, pivot_table with fill_value.
- Series-level dropna/fillna separate benchmarks.
- More str_* ops: strftime on datetime accessor.
- Series arithmetic edge cases: floordiv, mod, pow operators — ✅ Done (iter 70/71)
- Index operations: sort, nunique (Index has these methods) — ✅ Done (iter 71)
- DataFrame shift/diff if added to API.
- GroupBy nunique if API exists.
- DataFrame str accessor on columns.
- DataFrameExpanding min/max/count/median — ✅ Done (iter 71)
- EWM apply with custom function — ✅ Done (iter 71)
- DataFrameEwm std/var — ✅ Done (iter 71)
- Series comparison operators — ✅ Done (iter 71)
- Index set ops — ✅ Done (iter 71)
- DataFrame rank — ✅ Done (iter 71)
- series_groupby_transform, index_contains, dataframe_apply_axis1, index_sort, dataframe_rolling_apply — ✅ Done (iter 72)
- index_slice_take, index_drop_duplicates, countna, series_str_replace, groupby_get_group — ✅ Done (iter 73/74)
- str_strip, str_pad, dt_floor_ceil — ✅ Done (iter 74)
- str_startswith_endswith, str_match, str_join, str_cat, dt_normalize, dt_quarter_month — ✅ Done (iter 75)
- iter 79 (⚠️ error): Same 18 pairs as below attempted but push failed again (4th consecutive MCP error).
- **NEXT ITERATION (high priority)**: Recreate these 18 pairs from 3c596789 branch (251 pairs): index_delete_drop, index_equals_identical, index_arg_sort, index_isna_dropna, index_min_max, index_argmin_argmax, index_insert, index_nunique, str_fullmatch, str_lower_upper, str_find, str_repeat, str_is_alpha_digit, dt_is_year_start_end, dt_is_leap_year, dt_days_in_month, dt_is_month_start_end, dt_hour_minute_second → metric=269 (+18)
- Remaining after iter 79: str_case (title/capitalize/swapcase), str_zfill/center/ljust/rjust, str_count (str.count), str_slice/get, str_isalnum/isnumeric/islower/isupper/istitle/isspace, index_fillna, index_append, index_rename, IO benchmarks (read_parquet, to_parquet)

---

## 📊 Iteration History

### Iteration 79 — 2026-04-14 21:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24423431665)

- **Status**: ⚠️ Error
- **Change**: Attempted to add 18 new benchmark pairs: index_delete_drop, index_equals_identical, index_arg_sort, index_isna_dropna, index_min_max, index_argmin_argmax, index_insert, index_nunique, str_fullmatch, str_lower_upper, str_find, str_repeat, str_is_alpha_digit, dt_is_year_start_end, dt_is_leap_year, dt_days_in_month, dt_is_month_start_end, dt_hour_minute_second. Metric would be 269 (+18 vs 251).
- **Metric**: N/A (push blocked — safeoutputs MCP server still unavailable, 4th consecutive)
- **Commit**: 483c58e (local only, not pushed — workspace ephemeral, lost after run)
- **Notes**: Branched from 3c596789 (actual 251 pairs, commit says 265 but actual count is 251). All 18 files created and committed. push_to_pull_request_branch not callable. Next iteration must recreate same 18 pairs from 3c596789 branch.

### Iteration 78 — 2026-04-14 20:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24422133244)

- **Status**: ⚠️ Error
- **Change**: Attempted to add 8 new benchmark pairs: index_delete_drop, index_equals_identical, index_arg_sort, index_isna_dropna, str_fullmatch, dt_is_year_start_end, dt_is_leap_year, dt_days_in_month. Metric would be 259 (+8 vs 251).
- **Metric**: N/A (push blocked — same infra issue as iters 76 and 77)
- **Commit**: 0e6a6aa (local only, not pushed)
- **Notes**: 3rd consecutive error from safeoutputs MCP unavailability. push_to_pull_request_branch not registered; git push blocked (no auth). Program auto-paused. Commit exists locally at 0e6a6aa on branch autoloop/perf-comparison. Next iteration should push this commit via cherry-pick from fresh checkout of 3c596789 branch.

### Iteration 77 — 2026-04-14 20:22 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24421006159)
- ⚠️ Error: safeoutputs MCP tools unavailable (same as iter 76). Created 8 benchmark pairs: index_delete_drop, index_equals_identical, index_arg_sort, index_isna_dropna, str_fullmatch, dt_is_year_start_end, dt_is_leap_year, dt_days_in_month. Committed locally as d9cb4dd on autoloop/perf-comparison but push failed. Metric would be 259 (+8 vs 251). Next iteration: recreate same 8 pairs from 3c596789 branch (251) + these 8 = 259.

### Iteration 76 — 2026-04-14 19:32 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24418824772)
- ⚠️ Error: safeoutputs MCP server blocked by policy. Created 8 new benchmark pairs (259 total from 251): index_delete_drop, index_equals_identical, index_arg_sort, index_isna_dropna, str_fullmatch, dt_is_year_start_end, dt_is_leap_year, dt_days_in_month. Committed locally to autoloop/perf-comparison (b518c5b) but push failed. Next iteration can recreate same 8 pairs from 3c596789 branch (251 pairs) + these 8 new = 259.

### Iteration 75 — 2026-04-14 18:53 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24417123491)
- ✅ Accepted metric=265 (+6 vs prev best 259) | Branched from 3c596789 (259 after merge main) + 6 new: str_startswith_endswith, str_match, str_join, str_cat, dt_normalize, dt_quarter_month | Commit: d95af07

### Iteration 74 — 2026-04-14 18:27 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24415974514)
- ✅ Accepted metric=259 (+3 vs prev best 256) | Branched from 3c596789 (251 after merge main) + 8 new: countna, series_str_replace, index_slice_take, index_drop_duplicates, groupby_get_group, str_strip, str_pad, dt_floor_ceil | Commit: 18927bf

### Iteration 73 — 2026-04-14 17:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24414551013)
- ✅ Accepted metric=256 (+5 vs prev best 251) | Branched from 3c596789 (251 after merge main) + 5 new: index_slice_take, index_drop_duplicates, countna, series_str_replace, groupby_get_group | Commit: e5fa59b

### Iteration 72 — 2026-04-14 17:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24413338114)
- ✅ Accepted metric=251 (+5 vs prev best 246) | Branched from 3c596789 (220 pairs) + merge main (234 after conflict resolution) + 17 new: ewm_apply, ewm_cov, expanding_min/max/count/median, series_compare, index_ops, dataframe_rank, series_floordiv_mod_pow, dataframe_ewm_std_var, dataframe_expanding_min_max, series_groupby_transform, index_contains, dataframe_apply_axis1, index_sort, dataframe_rolling_apply | Commit: 3059488


### Iteration 71 — 2026-04-14 16:34 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24410938209)
- ✅ Accepted metric=246 (+2 vs prev best 244) | Branched from 3c596789 (220 pairs) + merge main (234 after conflict resolution) + 12 new: expanding_min/max/count/median, series_compare, index_ops, dataframe_rank, ewm_cov, series_floordiv_mod_pow, dataframe_ewm_std_var, ewm_apply, dataframe_expanding_min_max | Commit: 96338a8

### Iteration 70 — 2026-04-14 15:58 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24409238476)
- ✅ Accepted metric=244 (+3 vs prev best 241) | Branched from 3c596789 (220 pairs) + merge main (234 after conflict resolution) + 10 new: expanding_min, expanding_max, expanding_count, expanding_median, series_compare, index_ops, dataframe_rank, ewm_cov, series_floordiv_mod_pow, dataframe_ewm_std_var | Commit: 55972b2

### Iteration 69 — 2026-04-14 15:29 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24407809452)
- ✅ Accepted metric=241 (+7 vs prev best 234) | Branched from 3c596789 (220 pairs) + merge main (234 after conflict resolution) + 7 new: expanding_min, expanding_max, expanding_count, expanding_median, series_compare (eq/ne/lt/gt/le/ge), index_ops (union/intersection/difference), dataframe_rank (rankDataFrame) | Commit: 1508581

### Iteration 68 — 2026-04-14 14:37 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24405116522)
- ✅ Accepted metric=234 (+4 vs prev best 230) | Branched from 3c596789 (172 pairs) + merge main (186) + 48 new pairs across Series (median/min_max/sum_mean/unique/corr/std_var/filter/count/toobject/resetindex/isin/quantile/sort_index/loc/iloc/describe/copy/rename/dropna/isna_notna/groupby), DataFrame (set_index/sort_index/iloc/loc/drop/resetindex/count/sum_mean/assign/select/to_array/to_records/to_dict/fillna/isna/notna/min_max/std_var/describe), concat_axis1, merge_left/right/outer/inner, ewm_corr, groupby_median, groupby_std_df | Commit: b728240

### Iteration 67 — 2026-04-14 13:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24401981816)
- ✅ Accepted metric=230 (+7 vs prev best 223) | Started from 3c596789 (172 pairs) + merge main (186) + 44 new: series_median/min_max/sum_mean/unique/corr/std_var/filter/count/toobject/resetindex/isin/quantile/sort_index/loc/iloc/describe/copy/rename/nunique, dataframe_set_index/sort_index/iloc/loc/drop/resetindex/count/sum_mean/assign/select/to_array/to_records/to_dict/fillna/isna/notna/min_max/std_var/describe, concat_axis1, merge_left/right/outer/inner, ewm_corr, groupby_median | Commit: 375011a

### Iteration 66 — 2026-04-14 12:52 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24399899563)
- ⚠️ Error: Push failed. Created 42 new benchmark pairs (186→228 total, metric would have been 228). Committed locally to autoloop/perf-comparison (81bf680) but push failed: safeoutputs MCP server was filtered due to 401 MCP registry policy check failure. Next iteration can recreate same 42 pairs from 3c596789 branch (186 after merge main) + series_median/min_max/sum_mean/unique/corr/std_var/filter/count/toobject/resetindex/isin/quantile/sort_index/loc/iloc/describe, dataframe_set_index/sort_index/iloc/loc/drop/resetindex/count/sum_mean/assign/select/to_array/to_records/to_dict/fillna/isna/notna/min_max/std_var/describe, concat_axis1, merge_left/right/outer/inner, ewm_corr, groupby_median

### Iteration 65 — 2026-04-14 12:24 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24398649588)
- ✅ Accepted metric=223 (+14 vs prev best 209) | Started from 3c596789 branch (172 pairs) + merge main (186) + 37 new: series_median/min_max/sum_mean/unique/corr/std_var/filter/count/toobject/resetindex/isin/quantile, dataframe_set_index/sort_index/iloc/loc/drop/resetindex/count/sum_mean/assign/select/to_array/to_records/to_dict/fillna/isna/notna/min_max/std_var, concat_axis1, merge_left/right/outer/inner, ewm_corr, groupby_median | Commit: 8d94ea3

### Iteration 64 — 2026-04-14 11:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24397234972)
- ✅ Accepted metric=209 (+2 vs prev best 207) | Started from 3c596789 branch (172 pairs) + 37 new: series_median/min_max/sum_mean/unique/corr/std_var/filter/count/toobject/resetindex/isin/quantile, dataframe_set_index/sort_index/iloc/loc/drop/resetindex/count/sum_mean/assign/select/to_array/to_records/to_dict/fillna/isna/notna/min_max/std_var, concat_axis1, merge_left/right/outer/inner, ewm_corr, groupby_median | Commit: 61a8d80

### Iteration 63 — 2026-04-14 10:39 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24394419832)
- ✅ Accepted metric=207 (+5 vs prev best 202) | Based on 3c596789 branch (172 pairs) + 35 new: concat_axis1, dataframe_set/sort_index, dataframe_iloc/loc/drop/assign/select/to_array/to_records/to_dict/fillna/isna/notna/min_max/std_var/count/sum_mean/resetindex, series_median/min_max/sum_mean/unique/corr/filter/count/std_var/toobject/resetindex, merge_left/right/inner/outer, ewm_corr, groupby_median | Commit: b81351e

### Iteration 62 — 2026-04-14 09:59 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24392806184)
- ✅ Accepted metric=202 (+1 vs prev best 201) | Recovered 186 pairs from 3c596789 branch + 16 new: concat_axis1, dataframe_set_index, dataframe_sort_index, dataframe_iloc, dataframe_drop, dataframe_to_array, dataframe_fillna, dataframe_isna, dataframe_loc, dataframe_min_max, dataframe_std_var, series_median, series_min_max, series_sum_mean, merge_left, merge_outer | Commit: f56b6d5

### Iteration 61 — 2026-04-14 09:02 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24390384652)
- ✅ Accepted metric=201 (+15 vs prev best 186) | Recovered all 150 from hashed branches + 15 new: series_unique, series_isin, series_corr, series_filter, series_count, series_std_var, series_toobject, dataframe_assign, dataframe_select, dataframe_to_records, dataframe_to_dict, dataframe_count, dataframe_sum_mean, ewm_corr, groupby_median | Commit: 687990c

### Iteration 60 — 2026-04-14 08:07 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24388084827)
- ✅ Accepted metric=186 (+14 vs prev best 172) | Recovered 157 pairs from 8 hashed branches + 29 new: dataframe_abs/round/clip/cumsum/cummax/cummin/cumprod, groupby_first/last/sum/count/min/max/size, datetime_accessor, percentile_of_score, quantile, str_byte_length/char_width, dataframe_value_counts, attrs_ops/count_keys, make_formatter, cat_union_intersect_diff, dataframe_where/mask, series_dt_strftime, dataframe_nlargest_nsmallest, fillna_dropna | Commit: 249e71e

### Iteration 59 — 2026-04-14 07:05 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24385692074)
- ✅ Accepted metric=172 (+5 vs prev best 167) | Union 3c596789 branch (157 pairs) + 15 new: dataframe_abs, dataframe_round, dataframe_clip, dataframe_cumsum, dataframe_cummax, dataframe_cummin, dataframe_cumprod, groupby_first, groupby_last, datetime_accessor, percentile_of_score, quantile, str_byte_length, dataframe_value_counts, attrs_ops | Commit: d967d82

### Iteration 58 — 2026-04-14 06:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24383841023)
- ✅ Accepted metric=167 (+10 vs prev best 157) | Union 143-branch (106 new pairs) + 10 brand-new: dataframe_abs, dataframe_round, dataframe_clip, dataframe_cumsum, dataframe_cummax, percentile_of_score, quantile, str_byte_length, dataframe_value_counts, attrs_ops | Commit: 8da9620

### Iteration 57 — 2026-04-14 05:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24382472700)
- ✅ Accepted metric=157 (+7 vs prev best 150) | Union 8 hashed branches (97 pairs) + 60 new: all iter52-56 pairs recovered + new (dataframe_transform, dataframe_apply_map, count_valid, dataframe_transform_rows, cat_equal_categories, groupby_apply) | Commit: ba7eebd

### Iters 46–55 — 2026-04-13/14 (all ✅ accepted, metrics 34→145): Steady accumulation; recovery pipeline established with 8 hashed branches union + new pairs each run.

### Iters 25–45 — 2026-04-13 (all ✅ accepted, metrics progressively increasing to 33): Baseline resets to 22 after each merge; best-ever was 239 before resets
