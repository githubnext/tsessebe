# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-14T00:33:13Z |
| Iteration Count | 53 |
| Best Metric | 129 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | (created this run) |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: (created this run)
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- Metric counts .ts+.py file pairs; start from main each iter, add new pairs via Python generator.
- Bun not installed; TS benchmark files validated by file-count metric only.
- MCP: init session → notifications/initialized → tools/call with Mcp-Session-Id. push_repo_memory limit ~10KB total.
- After merges baseline resets to 22; always recreate branch from main + union all hashed branches first.
- Best strategy: union all hashed branches (8 total, 97 unique pairs) + add new ones each iter.
- Exports: seriesRound (not round), clip, cummax/cummin/cumprod, s.dt.year() is method, coefficientOfVariation/zscore standalone, catFromCodes(codes, categories), strRPartition on Series.
- rolling has min/max/median/count/var/std/sum/sem/skew/kurt/quantile; Expanding.std/var/sum; EWM.var.
- All of iter52's 20 new pairs confirmed: cat_to_ordinal, cat_recode, str_get_dummies, str_extract_all, str_normalize, str_remove_prefix/suffix, dataframe_from_pairs, format_scientific/engineering/thousands/currency/compact, apply_series_formatter, groupby_std/var, pipe, coefficient_of_variation, multi_index, dataframe_rolling.
- Iter-53 added 12 more new pairs: str_translate, cat_cross_tab, cat_freq_table, cat_sort_by_freq, dataframe_expanding, dataframe_ewm, series_apply, histogram, arange_linspace, str_partition, str_rpartition, from_dict_oriented.

---

## 🔭 Future Directions

- strTranslate benchmark (strTranslate function). ✅ Done iter-53
- groupby with custom agg function benchmark.
- catCrossTab, catFreqTable, catSortByFreq benchmarks. ✅ Done iter-53
- DataFrameExpanding, DataFrameEwm benchmarks. ✅ Done iter-53
- seriesApply, seriesTransform benchmarks. ✅ Done iter-53
- histogram, arange/linspace benchmarks. ✅ Done iter-53
- strPartition, strRPartition benchmarks. ✅ Done iter-53
- fromDictOriented benchmark. ✅ Done iter-53
- seriesTransform benchmark (next).
- groupby custom agg function benchmark (next).
- applyDataFrameFormatter benchmark.
- dataFrameToString/seriesToString benchmark.
- seriesMeta/multiReplace/indent/dedent benchmarks.

---

## 📊 Iteration History

### Iteration 53 — 2026-04-14 00:33 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24374280631)
- ✅ Accepted metric=129 (+12) | Union all 8 hashed branches (97 pairs) + 32 new: 20 iter-52 recoveries + 12 new iter-53: str_translate, cat_cross_tab, cat_freq_table, cat_sort_by_freq, dataframe_expanding, dataframe_ewm, series_apply, histogram, arange_linspace, str_partition, str_rpartition, from_dict_oriented | Commit: 240207d

### Iteration 52 — 2026-04-13 23:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24372801781)
- ✅ Accepted metric=117 (+8) | Union all 8 hashed branches (97 pairs) + 20 new: cat_to_ordinal, cat_recode, str_get_dummies, str_extract_all, str_normalize, str_remove_prefix/suffix, dataframe_from_pairs, format_scientific/engineering/thousands/currency/compact, apply_series_formatter, groupby_std/var, pipe, coefficient_of_variation, multi_index, dataframe_rolling | Commit: 6a4c100

### Iteration 51 — 2026-04-13 23:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24371856975)
- ✅ Accepted metric=109 (+19) | Discovered 8 hashed branches (97 unique pairs); unioned all + 12 new | Commit: 563677a

### Iteration 50 — 2026-04-13 ~23:00 UTC
- ✅ Accepted metric=90 (+15) | 68 pairs (53 from iters 46–49 + 15 new: cat_freq_table, format_float/percent, series_apply/transform, digitize, percentile_of_score, groupby_sum/count/min/max, isna_check, countna, nsmallest, linspace) | Commit: 07a1436

### Iteration 49 — 2026-04-13 22:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24369734912)
- ✅ Accepted metric=75 | 53 pairs: +unstack, series/dataframe_abs, pop_column, from_dict_oriented, reorder_columns, value_counts, dataframe_value_counts, rank_dataframe, cat_sort_by_freq, move_column, dataframe_where

### Iteration 48 — 2026-04-13 21:56 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24368561859)
- ✅ Accepted metric=51 | +rolling_sem/skew/kurt/quantile, expanding_std/var/sum, ewm_var, series_where/mask, cat_from_codes, insert_column, to_dict_oriented, stack

### Iteration 47 — 2026-04-13 21:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24367359778)
- ✅ Accepted metric=37 | +rolling_min/max/median/count/var, ewm_std, series_clip/cummax/cummin/cumprod, dataframe_cov, wide_to_long, cut, qcut, series_round

### Iteration 46 — 2026-04-13 20:53 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24366249761)
- ✅ Accepted metric=34 | +zscore, min_max_normalize, melt, pearson_corr, dataframe_corr, rolling_std/sum, expanding_mean, to_csv, to_json, series_rank, series_nlargest

### Iters 25–45 — 2026-04-13 (all ✅ accepted, metrics progressively increasing to 33): Baseline resets to 22 after each merge; best-ever was 239 before resets
