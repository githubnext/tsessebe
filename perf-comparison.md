# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-15T01:36:58Z |
| Iteration Count | 85 |
| Best Metric | 269 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #141 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | safeoutputs MCP unavailable (iter 85, 10th consecutive). Local commit bb0eb7f (+8 pairs: str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, index_fillna, index_append, index_rename → 277 total). Remote metric remains 269. |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 10 |
| Recent Statuses | error, error, error, error, error, error, error, error, error, error |
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

- Metric = min(ts_bench_count, py_bench_count); base branch is origin/autoloop/perf-comparison-3c596789b15fd053 (actual 251 pairs despite commits saying 265).
- Bun not installed; TS benchmark files validated by file-count metric only.
- push_repo_memory limit ~8 KB per file (total ~10 KB across all files).
- Index API: delete(), drop(), equals(), identical(), argsort(), isna(), dropna(), min(), max(), argmin(), argmax(), insert(), nunique(), fillna(), append(), rename().
- String accessor: fullmatch(), lower(), upper(), title(), capitalize(), swapcase(), find(), rfind(), repeat(), isalpha(), isdigit(), isalnum(), isnumeric(), islower(), isupper(), istitle(), isspace(), zfill(), center(), ljust(), rjust(), slice(), count().
- DatetimeAccessor: is_year_start(), is_year_end(), is_leap_year(), days_in_month(), is_month_start(), is_month_end(), hour(), minute(), second().
- Branching: checkout origin/autoloop/perf-comparison-3c596789b15fd053 as local autoloop/perf-comparison, add pairs, commit, push via push_to_pull_request_branch to PR #141.
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only; Series({data,name,index}); df.assign({c: series}) direct.

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
- Remaining after iter 80: str_case (title/capitalize/swapcase), str_zfill/center/ljust/rjust, str_count (str.count), str_slice/get, str_isalnum/isnumeric/islower/isupper/istitle/isspace, index_fillna, index_append, index_rename, IO benchmarks (read_parquet, to_parquet) — ✅ All string/index ops Done (iter 82)
- IO benchmarks (read_parquet, to_parquet) still pending if API exists.
- str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, index_fillna, index_append, index_rename — committed as d120f51 (local) but never pushed due to safeoutputs MCP unavailability.
- Next: On run when safeoutputs is available, re-create these 8 pairs or push d120f51. Pairs: str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, index_fillna, index_append, index_rename.

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 85 — 2026-04-15 01:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24431819309)

- **Status**: ⚠️ Error
- **Change**: Added 8 pairs: str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, index_fillna, index_append, index_rename. Local commit bb0eb7f. Metric would be 277.
- **Metric**: N/A (push blocked — safeoutputs MCP unavailable, 10th consecutive failure)
- **Commit**: bb0eb7f (local only)
- **Notes**: All 16 benchmark files created and committed. push_to_pull_request_branch, add_comment, and noop tools all return "Tool does not exist".

### Iteration 84 — 2026-04-15 00:34 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24430048504)

- **Status**: ⚠️ Error
- **Change**: Added 8 pairs: str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, index_fillna, index_append, index_rename. Local commit e1adbe4. Metric would be 277.
- **Metric**: N/A (push blocked — safeoutputs MCP unavailable, 9th consecutive failure)
- **Commit**: e1adbe4 (local only)
- **Notes**: All 16 benchmark files created and committed. Branch: autoloop/perf-comparison based on origin/autoloop/perf-comparison-3c596789b15fd053. safeoutputs tools not in available tool list (add_comment returns "Tool does not exist").

### Iteration 83 — 2026-04-14 23:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24428630710)

- **Status**: ⚠️ Error
- **Change**: Added 8 pairs: str_case, str_zfill_center_ljust_rjust, str_count, str_slice_get, str_isalnum_isnumeric, index_fillna, index_append, index_rename. Local commit d120f51. Metric would be 277.
- **Metric**: N/A (push blocked — safeoutputs MCP unavailable, 8th consecutive failure)
- **Commit**: d120f51 (local only)
- **Notes**: All 16 benchmark files (8 TS + 8 PY) created and committed. safeoutputs tools not in available tool list.

### Iteration 81 — 2026-04-14 22:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24426723308)

- **Status**: ⚠️ Error
- **Change**: Added 8 pairs: str_title_capitalize_swapcase, str_zfill_center_ljust_rjust, str_slice_get, str_count, str_isalnum_isnumeric, index_fillna, index_append, index_rename. Local commit 3c4abe0. Metric would be 277.
- **Metric**: N/A (push blocked — safeoutputs MCP unavailable, HTTPS auth required for git push)
- **Commit**: 3c4abe0 (local only)

### Iteration 80 — 2026-04-14 22:17 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24425660811)

- **Status**: ⚠️ Error
- **Change**: Added 18 pairs locally: index_delete_drop, index_equals_identical, index_arg_sort, index_isna_dropna, index_min_max, index_argmin_argmax, index_insert, index_nunique, str_fullmatch, str_lower_upper, str_find, str_repeat, str_is_alpha_digit, dt_is_year_start_end, dt_is_leap_year, dt_days_in_month, dt_is_month_start_end, dt_hour_minute_second.
- **Metric**: N/A (push blocked — safeoutputs GitHub auth expired: "Invalid username or token")
- **Commit**: e5e32a8 (local only — tracking origin/autoloop/perf-comparison-3c596789b15fd053)
- **Notes**: MCP server reachable but push_to_pull_request_branch fails with GitHub auth error. 5th consecutive push failure. Next iteration: recreate same 18 pairs; metric=269 (+18 vs 251).

### Iteration 79 — 2026-04-14 21:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24423431665)
- ⚠️ Error: push_to_pull_request_branch not callable (4th consecutive). Same 18 pairs created locally (commit 483c58e), metric would be 269.

### Iters 76–78 — ⚠️ Error: safeoutputs MCP unavailable. Created 8 pairs each (259 total from 251); all local commits lost (ephemeral workspace).

### Iteration 75 — 2026-04-14 18:53 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24417123491)
- ✅ metric=265 (+6) | +6 new: str_startswith_endswith, str_match, str_join, str_cat, dt_normalize, dt_quarter_month | Commit: d95af07

### Iteration 74 — 2026-04-14 18:27 UTC — ✅ metric=259 (+3) | +8: countna, series_str_replace, index_slice_take, index_drop_duplicates, groupby_get_group, str_strip, str_pad, dt_floor_ceil | Commit: 18927bf

### Iteration 73 — 2026-04-14 17:55 UTC — ✅ metric=256 (+5) | +5: index_slice_take, index_drop_duplicates, countna, series_str_replace, groupby_get_group | Commit: e5fa59b

### Iteration 72 — 2026-04-14 17:35 UTC — ✅ metric=251 (+5) | +17: ewm_apply, ewm_cov, expanding_min/max/count/median, series_compare, index_ops, dataframe_rank, series_floordiv_mod_pow, dataframe_ewm_std_var/expanding_min_max, series_groupby_transform, index_contains, dataframe_apply_axis1, index_sort, dataframe_rolling_apply | Commit: 3059488

### Iters 57–71 — 2026-04-14 (all ✅ accepted, metrics 157→246): Rebuilt from 3c596789 branch; added ewm/expanding/groupby/merge/str/dt ops; best commits: 96338a8 (246), 55972b2 (244), 1508581 (241), b728240 (234), 8d94ea3 (223), f56b6d5 (202), 687990c (201), 249e71e (186), d967d82 (172), 8da9620 (167), ba7eebd (157).

### Iters 46–56 — 2026-04-13/14 (all ✅ accepted, metrics 34→150): Steady accumulation; recovery pipeline established with 8 hashed branches union + new pairs each run.

### Iters 25–45 — 2026-04-13 (all ✅ accepted, metrics progressively increasing to 33): Baseline resets to 22 after each merge; best-ever was 239 before resets
