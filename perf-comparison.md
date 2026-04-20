# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-20T06:58:00Z |
| Iteration Count | 248 |
| Best Metric | 539 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #150 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, error, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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

- **Iter 247 push failed**: commit 69c7ad0 was not found in origin/autoloop/perf-comparison. The actual pushed baseline after merging origin/main was 534 (not 539). Iter 248 re-added the same targets plus combine_first_series and astype_dataframe to reach 539 with a real push.
- **RETRY TARGETS COMPLETED** (iter 248): 5 new benchmark pairs pushed: shift_series_fn, reindex_fill, sample_weighted, combine_first_series, astype_dataframe. Metric: 534→539.
- **State file now accurate**: After merging origin/main (which had 534 pairs), added 5 new pairs to reach 539. Previous state file "best_metric=534" was accurate — the branch had been reset by the sync from origin/autoloop/perf-comparison which was at 508. Always merge origin/main into autoloop/perf-comparison at the start of each iteration.
- **Standalone vs method APIs**: Many functions have both a standalone form (`dataFrameAbs(df)`) and a method form (`df.abs()`). Existing benchmarks often used method forms; standalone versions of `dataFrameAbs`, `dataFrameRound`, `dataFrameRollingApply`, `combineFirstSeries/DataFrame`, and raw `digitize` were unbenchmarked. These are good targets for the next iteration.
- **New canonical baseline is 539** (iter 244). Added 5 new benchmark pairs: str_swapcase_capitalize, dt_strftime, series_reflected_arith, dataframe_reflected_arith, any_all. Note: best_metric reset from inflated 594 (local-only) to actual pushed count of 534→539.
- **DataFrame construction**: use `DataFrame.fromColumns({...})` not `new DataFrame({...})` — the constructor takes a `ReadonlyMap` not a plain object.
- **New canonical baseline is 594** (iter 243). Cherry-picked all 55 pairs from `origin/autoloop/perf-comparison-8724e9f9` and added 5 new pairs: merge_multi_col, concat_many_small, series_where_scalar, groupby_transform_multikey, rank_pct. COMMITTED LOCAL ONLY — safeoutputs unavailable.
- **New canonical baseline is 588** (iter 242, pushed to PR #150). Cherry-picked all 10 commits from `origin/autoloop/perf-comparison-8724e9f9` (adding 50 previously-stranded pairs) plus added 4 new benchmark pairs.
- **push_to_pull_request_branch IS available when safeoutputs are configured.** Iters 238-241 all failed locally; iter 242 succeeded.
- **CRITICAL**: Use `autoloop/perf-comparison` (PR #150). Metric = min(ts_bench_count, py_bench_count).
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- reindexSeries/reindexDataFrame support method: "ffill"|"bfill"|"nearest" with optional limit.
- shiftSeries/diffSeries are standalone exports.

---

## 🔭 Future Directions

- Continue adding benchmark pairs for remaining unbenchmarked functions (many still available).
- Look for functions in src/ not yet tested: more str* variants, more groupby/window variants, etc.

---

## 📊 Iteration History

### Iteration 248 — 2026-04-20 06:58 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24652467203)

- **Status**: ✅ Accepted | **Metric**: 539 (actual pushed baseline 534, delta: +5) | **Commit**: 42c00c5
- Added 5 benchmark pairs: shift_series_fn (standalone shiftSeries), reindex_fill (reindexSeries ffill/bfill), sample_weighted (sampleSeries with weights), combine_first_series (combineFirstSeries standalone), astype_dataframe (astype DataFrame). Iter 247 commit not in origin; actual baseline was 534.

### Iteration 247 — 2026-04-20 05:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24650741846)

- **Status**: ⚠️ Push Failed (commit 69c7ad0 not found in origin) | **Metric**: 539 claimed, push did not reach origin
- Added 5 pairs locally: formatter_factories, cat_intersect_diff, series_shift_fn, reindex_fill, sample_weighted. State file updated but git push failed.

### Iteration 246 — 2026-04-20 04:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24648571554)

- **Status**: ⚠️ Local-only (Copilot CLI credential isolation prevents git push and safeoutputs MCP unavailable) | **Metric**: 539 (branch baseline 534, +5) | **Commit**: 8890210 (local only)
- Added 5 benchmark pairs: nlargest_df, series_shift_fn, digitize_fn, reindex_fill (ffill/bfill), sample_weighted. Commit 8890210 on autoloop/perf-comparison locally but NOT pushed. Next run should re-add the same 5 benchmark files (they will be missing from the fresh checkout).

### Iteration 245 — 2026-04-20 03:40 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24646490274)

- **Status**: ❌ Push Failed — safeoutputs MCP server unavailable in Copilot CLI context (filtered: "Could not verify server against any configured registry")
- Created 10 benchmark pairs locally (series_head_tail, series_shift_fn, series_autocorr, dataframe_col_arithmetic, dataframe_filter_select, dataframe_rolling_apply_fn, combine_first_fn, dataframe_abs_fn, dataframe_round_fn, digitize_fn) achieving 544 pairs. Commit 9058df2 exists locally on autoloop/perf-comparison but was NOT pushed. Next run: try the same benchmarks (or similar ones).

### Iteration 244 — 2026-04-20 01:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24644387987)

- **Status**: ✅ Accepted | **Metric**: 539 (previous best: 534, delta: +5) | **Commit**: 8085f7d
- Added 5 benchmark pairs: str_swapcase_capitalize, dt_strftime, series_reflected_arith, dataframe_reflected_arith, any_all. Note: DataFrame.fromColumns() required (not `new DataFrame({})`).

### Iteration 243 — 2026-04-20 00:32 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24642957273)

- **Status**: ⚠️ Local-only (safeoutputs MCP tools unavailable) | **Metric**: 594 (previous best: 589, delta: +5) | **Commit**: 3f5edd1 (local only)
- Brought in 55 previously-stranded pairs from `origin/autoloop/perf-comparison-8724e9f9` + 5 new pairs: merge_multi_col, concat_many_small, series_where_scalar, groupby_transform_multikey, rank_pct. Committed but could not push to PR #150.

### Iteration 242 — 2026-04-19 23:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24642049236)

- **Status**: ✅ Accepted | **Metric**: 588 (previous best: 534, delta: +54) | **Commit**: 8f477b6
- Cherry-picked 10 commits from `origin/autoloop/perf-comparison-8724e9f9` (+50 pairs) plus added 4 new: explode_series_fn, attrs_clear_copy_merge, attrs_crud, type_guards_batch. Successfully pushed to PR #150.

### Iters 231–241 — ⚠️/✅ mix | canonical metric 534→540; many local-only pushes failed due to safeoutputs unavailability.

### Iters 163–230 — ✅/⚠️ mix | metrics 508→534 on canonical branch. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline + all major functions benchmarked.
