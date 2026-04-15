# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-15T14:36:09Z |
| Iteration Count | 99 |
| Best Metric | 305 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #141 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 1 |
| Recent Statuses | error, accepted, error, accepted, error, error, accepted, error, error, error |
| Paused | false |

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

- Metric = min(ts_bench_count, py_bench_count); base branch is origin/autoloop/perf-comparison-3c596789b15fd053 (actual 251 pairs despite commits saying 265).
- Bun not installed; TS benchmark files validated by file-count metric only.
- push_repo_memory limit ~8 KB per file (total ~10 KB across all files).
- Index API: delete(), drop(), equals(), identical(), argsort(), isna(), dropna(), min(), max(), argmin(), argmax(), insert(), nunique(), fillna(), append(), rename().
- String accessor: fullmatch(), lower(), upper(), title(), capitalize(), swapcase(), find(), rfind(), repeat(), isalpha(), isdigit(), isalnum(), isnumeric(), islower(), isupper(), istitle(), isspace(), zfill(), center(), ljust(), rjust(), slice(), count().
- DatetimeAccessor: is_year_start(), is_year_end(), is_leap_year(), days_in_month(), is_month_start(), is_month_end(), hour(), minute(), second().
- Branching: checkout origin/autoloop/perf-comparison-3c596789b15fd053 as local autoloop/perf-comparison, add pairs, commit, push via push_to_pull_request_branch to PR #141.
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only; Series({data,name,index}); df.assign({c: series}) direct.
- CategoricalAccessor instance methods (addCategories, removeCategories, renameCategories, setCategories, reorderCategories, asOrdered, asUnordered) are accessed via s.cat.<method>(). Python equivalent uses pd.Categorical directly.
- DatetimeAccessor has millisecond/microsecond/nanosecond/dayofyear/weekday/round/date methods not previously benchmarked.

---

## 🔭 Future Directions

- More groupby aggregation variants (nunique — check if API exists).
- IO benchmarks: read_parquet, to_parquet, read_excel.
- Advanced reshape: crosstab with margins, pivot_table with fill_value.
- Series-level dropna/fillna separate benchmarks.
- More str_* ops: strftime on datetime accessor.
- Series arithmetic edge cases: floordiv, mod, pow operators — ✅ Done (iter 70/71)
- Index operations: sort, nunique (Index has these methods) — ✅ Done (iter 71)
- DataFrame shift/diff if added to API.
- GroupBy nunique if API exists.
- DataFrameExpanding min/max/count/median — ✅ Done (iter 71)
- EWM apply with custom function — ✅ Done (iter 71)
- DataFrameEwm std/var — ✅ Done (iter 71)
- Series comparison operators — ✅ Done (iter 71)
- Index set ops — ✅ Done (iter 71)
- DataFrame rank — ✅ Done (iter 71)
- series_groupby_transform, index_contains, dataframe_apply_axis1, index_sort, dataframe_rolling_apply — ✅ Done (iter 72)
- str_strip, str_pad, dt_floor_ceil — ✅ Done (iter 74)
- str_startswith_endswith, str_match, str_join, str_cat, dt_normalize, dt_quarter_month — ✅ Done (iter 75)
- str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, str_islower_isupper, str_wrap, str_encode, str_istitle_isspace, index_fillna, index_append, index_rename — ✅ Done (iter 94).
- dt_millisecond_microsecond_nanosecond, dt_dayofyear_weekday, dt_round, dt_date, str_rsplit, str_slice_replace, index_isin, index_duplicated, cat_add_remove_categories, cat_rename_set_categories, cat_reorder_as_ordered, cat_value_counts — ✅ Done (already on branch from iter 95, actual metric 293).
- series_at_iat, index_getindexer, cat_remove_unused, stack, rolling_skew, rolling_kurt, rolling_sem, rolling_quantile — ✅ Done (iter 97).
- DataFrame.fromRecords, DataFrame.toRecords, DataFrame.setIndex, Series.setIndex — ✅ Done (iter 97).
- IO benchmarks (read_parquet, to_parquet) — not in src/io/; skip.
- MultiIndex create/access benchmarks — ✅ Done (iter 99).
- DataFrame.from2D, DataFrame.select — ✅ Done (iter 99).
- Series.toArray/toList benchmarks — ✅ Done (iter 99).
- Expanding sum/std/var/apply — ✅ Done (iter 99).
- rollingAgg/dataFrameRollingAgg standalone — ✅ Done (iter 99).
- Index.copy/toArray — ✅ Done (iter 99).
- MultiIndex setops (union/intersection/difference) — ✅ Done (iter 99).
- MultiIndex reorderLevels, setNames — ✅ Done (iter 99 via bench_multi_index_droplevel).
- groupby nunique — not in API; skip.
- Advanced reshape: crosstab with margins, pivot_table with fill_value.
- DataFrame.toDict other orientations (index, records, split) — potential next.
- Series.nbits/itemsize-style benchmarks if API exists.
- DataFrame.memory_usage benchmark if API exists.

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 99 — 2026-04-15 14:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24460598911)

- **Status**: ⚠️ Error
- **Change**: Added 12 pairs: expanding_sum, expanding_std, expanding_var, expanding_apply, rolling_agg, dataframe_rolling_agg, multi_index_getloc, multi_index_droplevel (incl. reorderLevels/setNames), multi_index_setops (union/intersection/difference), series_toarray_tolist, index_copy_toarray, dataframe_from2d_select. Local commit fef506e. Metric would be 317.
- **Metric**: N/A (push blocked — safeoutputs MCP tools unavailable; same as iters 83-98 except 86, 94, 97)
- **Commit**: fef506e (local only)
- **Notes**: MultiIndex constructor uses `{ tuples }` options bag; droplevel/reorderLevels/setNames all exist. dataFrameRollingAgg/rollingAgg are standalone exports. Expanding apply takes fn: (readonly number[]) => number.

### Iteration 98 — 2026-04-15 13:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24457541317)

- **Status**: ⚠️ Error
- **Change**: Added 10 pairs: expanding_sum, expanding_std, expanding_var, expanding_apply, rolling_agg, dataframe_rolling_agg, multi_index_getloc, multi_index_droplevel, series_toarray_tolist, index_copy_toarray. Local commit 32232b3. Metric would be 315.
- **Metric**: N/A (push blocked — safeoutputs MCP tools unavailable; same as iters 83-96 except 86, 94, 97)
- **Commit**: 32232b3 (local only)
- **Notes**: MultiIndex uses `MultiIndex.fromTuples()` static factory. rollingAgg/dataFrameRollingAgg are standalone exports. Expanding sum/std/var/apply had no existing benchmarks. Files committed locally, can't push to PR #141 without MCP tools.

### Iteration 97 — 2026-04-15 12:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24455451593)

- **Status**: ✅ Accepted
- **Change**: Added 12 pairs: series_at_iat, index_getindexer, cat_remove_unused, stack, rolling_skew, rolling_kurt, rolling_sem, rolling_quantile, dataframe_fromrecords, dataframe_torecords, dataframe_setindex, series_setindex.
- **Metric**: 305 (previous best: 293, delta: +12)
- **Commit**: 5ed4d5d
- **Notes**: safeoutputs MCP tools available this run. rollingSkew/Kurt/Sem/Quantile are standalone exports; stack() is from reshape. CatAccessor.removeUnusedCategories needs addCategories first to populate unused cats.

### Iteration 96 — 2026-04-15 12:23 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24454210628)

- **Status**: ⚠️ Error
- **Change**: Added 8 pairs: series_at_iat, index_getindexer, cat_remove_unused, stack, rolling_skew, rolling_kurt, rolling_sem, rolling_quantile. Local commit 9977ed9. Metric would be 301.
- **Metric**: N/A (push blocked — safeoutputs MCP tools unavailable; same as iters 83-93, 95)
- **Commit**: 9977ed9 (local only)
- **Notes**: Branch base was actually at 293 (iter 95 commit was already pushed). Discovered rollingSem/Skew/Kurt/Quantile are standalone exports from stats/window_extended.ts. stack() uses DataFrame.fromColumns. CatAccessor.removeUnusedCategories needs addCategories() first to populate extra cats.

### Iteration 95 — 2026-04-15 11:50 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24452790751)

- **Status**: ⚠️ Error
- **Change**: Added 12 pairs: dt_millisecond_microsecond_nanosecond, dt_dayofyear_weekday, dt_round, dt_date, str_rsplit, str_slice_replace, index_isin, index_duplicated, cat_add_remove_categories, cat_rename_set_categories, cat_reorder_as_ordered, cat_value_counts. Local commit db56034. Metric would be 293.
- **Metric**: N/A (push blocked — safeoutputs MCP tools unavailable; push_to_pull_request_branch returns "Tool does not exist")
- **Commit**: db56034 (local only)
- **Notes**: All 24 benchmark files (12 TS + 12 PY) created and committed. Same blocker as iters 83-93 (except 86, 94). safeoutputs MCP server not connected this run.

### Iteration 94 — 2026-04-15 10:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24450563155)

- **Status**: ✅ Accepted
- **Change**: Added 12 pairs: str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, str_islower_isupper, str_istitle_isspace, str_wrap, str_encode, index_fillna, index_append, index_rename.
- **Metric**: 281 (previous best: 269, delta: +12)
- **Commit**: 82afaa6
- **Notes**: safeoutputs MCP tools available this run. Successfully pushed 24 benchmark files (12 TS + 12 PY) covering remaining string accessor and Index methods.

### Iters 83–93 (except 86) — ⚠️ Error: safeoutputs MCP unavailable. Various pairs created locally; all pushes blocked.

### Iteration 86 — 2026-04-15 03:06 UTC — ✅ metric=277 (+8) | Commit: 809e0e9

### Iters 75–85 — 2026-04-14/15 — mix of ✅ accepted (75: +6, 74: +8, 73: +5, 72: +17) and ⚠️ errors.

### Iters 57–71 — 2026-04-14 (all ✅ accepted, metrics 157→246): Rebuilt from 3c596789 branch; added ewm/expanding/groupby/merge/str/dt ops.

### Iters 25–56 — 2026-04-13/14 (all ✅ accepted, metrics progressively 0→157): Baseline established, steady accumulation.
