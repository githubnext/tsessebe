# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-16T03:07:33Z |
| Iteration Count | 119 |
| Best Metric | 62 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #141 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 1 |
| Recent Statuses | accepted, error, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |
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

- **IMPORTANT**: Iter 118 reset best_metric to 57 (was 354). The old metric was inflated — previous iters tracked many functions but branches that were later merged/deleted caused the file count in main to drop back to 51. The canonical branch `autoloop/perf-comparison` never existed before iter 118; was re-created from main. Each iter should add benchmark pairs and compare to actual file counts.
- Metric = min(ts_bench_count, py_bench_count); branch autoloop/perf-comparison. Best metric 334 after iter 114, commit 685193d. Iters 107-113 were push-blocked (safeoutputs MCP blocked by policy). Iter 114 succeeded when policy was restored.
- Bun not installed; TS benchmark files validated by file-count metric only.
- push_repo_memory limit ~8 KB per file (total ~10 KB across all files).
- Index API: delete(), drop(), equals(), identical(), argsort(), isna(), dropna(), min(), max(), argmin(), argmax(), insert(), nunique(), fillna(), append(), rename(), symmetricDifference() — all benchmarked.
- String accessor: fullmatch(), lower(), upper(), title(), capitalize(), swapcase(), find(), rfind(), repeat(), isalpha(), isdigit(), isalnum(), isnumeric(), islower(), isupper(), istitle(), isspace(), zfill(), center(), ljust(), rjust(), slice(), count().
- DatetimeAccessor: is_year_start(), is_year_end(), is_leap_year(), days_in_month(), is_month_start(), is_month_end(), hour(), minute(), second().
- Branching: checkout origin/autoloop/perf-comparison-3c596789b15fd053 as local autoloop/perf-comparison, add pairs, commit, push via push_to_pull_request_branch to PR #141.
- groupby AggName: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only; Series({data,name,index}); df.assign({c: series}) direct.
- CategoricalAccessor instance methods (addCategories, removeCategories, renameCategories, setCategories, reorderCategories, asOrdered, asUnordered) are accessed via s.cat.<method>(). Python equivalent uses pd.Categorical directly.
- DataFrame.col(), .has(), .get() are distinct methods for column access (col throws if missing, get returns undefined).
- toDictOriented supports "split", "tight", "records", "index", "dict", "columns", "list", "series" orientations.
- isScalar/isListLike/isArrayLike/isDictLike/isIterator are all exported utility functions from api_types.ts.
- MultiIndex constructor uses `new MultiIndex({ tuples })` — the constructor is public. Also supports `fromArrays()`. All instance methods (sortValues, equals, duplicated, dropDuplicates, isin, isna, notna, dropna, toArray) are fully covered as of iter 107.
- Index.isUnique/hasDuplicates/isMonotonicIncreasing/isMonotonicDecreasing are computed properties.
- str.len() measures string length of each element.
- Dtype.from() returns singletons; use Dtype.inferFrom(values) for inference, Dtype.commonType(a,b) for type promotion.
- attrs functions: getAttrs/setAttrs/updateAttrs/withAttrs (in attrs_ops), attrsCount/attrsKeys (in attrs_count_keys), getAttr/setAttr/clearAttrs/copyAttrs/deleteAttr/mergeAttrs/hasAttrs (in attrs_advanced) — all covered.
- catFromCodes() takes (codes, categories) and returns a CatSeriesLike; Python equivalent is pd.Categorical.from_codes().
- Extended value type predicates (isNumber/isBool/isStringValue/isFloat/isInteger/isBigInt/isRegExp/isMissing/isHashable/isDate) all exported from api_types.ts.
- Dtype predicates (isNumericDtype etc.) map to pd.api.types.is_numeric_dtype() etc. in Python.

---

## 🔭 Future Directions

- MultiIndex: getLoc with slice, get_locs, get_indexer for multi-label lookup.
- More groupby: nunique (check if API exists).
- Advanced reshape: crosstab with margins, pivot_table with fill_value.
- DataFrame shift/diff, series_pipe, DataFrame.copy(), Series.combine() if APIs exist.
- IO: read_parquet/to_parquet if added to src/io.
- src/core: period, timedelta, timestamp, interval, datetime_tz, date_range, align, reindex, categorical_index — check if exported and benchmarkable.

---

## 📊 Iteration History

### Iteration 119 — 2026-04-16 03:07 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24489800049)
- **Status**: ⚠️ Error (safeoutputs MCP unavailable — commit created but not pushed)
- **Change**: Added 6 benchmark pairs: combine_first, isin, explode, diff, interpolate, sample (commit 9e2acec on local branch autoloop/perf-comparison)
- **Metric**: 68 (would be +6 from 62) — NOT pushed
- **Notes**: safeoutputs MCP tools not available this run. Commit 9e2acec exists locally but could not be pushed. Next iteration should push this or add new pairs on top.

### Iteration 118 — 2026-04-16 01:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24487281656)
- **Status**: ✅ Accepted
- **Change**: Added 6 benchmark pairs: rank (rankSeries/rankDataFrame), nlargest_nsmallest (nlargestSeries/nsmallestSeries), sample (sampleSeries/sampleDataFrame), get_dummies (getDummies/dataFrameGetDummies), duplicated (duplicatedSeries/dropDuplicatesSeries/dropDuplicatesDataFrame), interpolate (interpolateSeries/dataFrameInterpolate)
- **Metric**: 57 (reset from stale 354; real baseline was 51, +6) | **Commit**: e0c0aa0
- **Notes**: Best metric reset from 354 to 57 because canonical branch autoloop/perf-comparison didn't exist and main only had 51 benchmark pairs. Created branch from main and added 6 new pairs covering previously uncovered stats functions.

### Iteration 117 — 2026-04-16 00:34 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24485542882)
- **Status**: ✅ Accepted
- **Change**: Added 6 benchmark pairs: searchsorted (searchsorted/searchsortedMany/argsortScalars), factorize (factorize/seriesFactorize), to_numeric (toNumericArray/toNumericSeries), json_normalize (jsonNormalize), select_dtypes (selectDtypes), memory_usage (seriesMemoryUsage/dataFrameMemoryUsage)
- **Metric**: 354 (previous: 348 post-merge, +6) | **Commit**: 970d5bf
- **Notes**: Filled previously uncovered utility functions from stats/ and io/. Note: baseline rose from 345→348 due to merging main which included earlier accepted benchmark commits.

### Iteration 116 — 2026-04-15 23:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24484182038)
- **Status**: ✅ Accepted
- **Change**: Added 5 benchmark pairs: cat_from_codes (catFromCodes/pd.Categorical.from_codes), multi_index_isin (MultiIndex.isin()), multi_index_reorder_levels (MultiIndex.reorderLevels()), multi_index_set_names (MultiIndex.setNames()), multi_index_to_array (MultiIndex.toArray())
- **Metric**: 345 (previous: 340, +5) | **Commit**: 3203925
- **Notes**: Covered remaining catFromCodes gap and 4 missing MultiIndex utility methods.

### Iteration 115 — 2026-04-15 23:18 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24483302039)
- **Status**: ✅ Accepted
- **Change**: Added 6 benchmark pairs: ewm_var (Series.ewm().var()), dt_is_quarter_start_end (DatetimeAccessor.is_quarter_start/is_quarter_end), dt_year_month_day (DatetimeAccessor.year/month/day), multi_index_sort_equals (sortValues+equals), multi_index_duplicated (duplicated+dropDuplicates), multi_index_isna_dropna (isna+notna+dropna)
- **Metric**: 340 (previous: 334, +6) | **Commit**: f392fdb
- **Notes**: Filled coverage gaps in EWM var, DateTime year/month/day and quarter accessors, MultiIndex lifecycle methods.

### Iteration 114 — 2026-04-15 22:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24482265300)
- **Status**: ✅ Accepted
- **Change**: Added bench_value_type_checks (11 predicates: isNumber/isBool/isStringValue/isFloat/isInteger/isBigInt/isRegExp/isReCompilable/isMissing/isHashable/isDate) and bench_dtype_predicates (15 predicates: isNumericDtype/isIntegerDtype/isFloatDtype/isBoolDtype/isStringDtype/isDatetimeDtype/isCategoricalDtype/isSignedIntegerDtype/isUnsignedIntegerDtype/isTimedeltaDtype/isObjectDtype/isComplexDtype/isExtensionArrayDtype/isPeriodDtype/isIntervalDtype)
- **Metric**: 334 (previous: 332, +2) | **Commit**: 685193d
- **Notes**: Pushed via MCP HTTP after resolving remote tracking ref issue (set refs/remotes/origin/autoloop/perf-comparison to 62b943a).

### Iters 107–113 — ⚠️ Error: safeoutputs MCP blocked by policy (7 consecutive). Each iter added 6 local pairs but could not push.

### Iteration 106 — 2026-04-15 18:27 UTC — ✅ metric=332 (+6) | Commit: 2128602
### Iteration 102 — 2026-04-15 16:26 UTC — ✅ metric=326 (+9) | Commit: bcf58b5
### Iteration 97 — 2026-04-15 12:51 UTC — ✅ metric=305 (+12) | Commit: 5ed4d5d
### Iteration 94 — 2026-04-15 10:55 UTC — ✅ metric=281 (+12) | Commit: 82afaa6
### Iteration 86 — 2026-04-15 03:06 UTC — ✅ metric=277 (+8) | Commit: 809e0e9
### Iters 75–85 — mix of ✅ accepted and ⚠️ errors; metrics 246→269.
### Iters 57–74 — all ✅ accepted; metrics 157→269. Rebuilt from 3c596789 branch.
### Iters 1–56 — all ✅ accepted; metrics 0→157. Baseline established.
