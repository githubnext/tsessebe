# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-09T18:24:06Z |
| Iteration Count | 147 |
| Best Metric | 40 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #81 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**State (iter 147)**: 40 files on PR #81 branch. string_ops_extended module added. Next priorities:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/accessor_extended.ts` — extended accessor methods (dt.round, str.decode, cat.rename_categories)
- `src/stats/numeric_extended.ts` — additional numeric ops (digitize, histogram, etc.)

---

## 📚 Lessons Learned

- **Iter 147 (string_ops_extended)**: `strSplitExpand` uses `n<0` → unlimited splits, `n≥0` → manual loop. `strExtractGroups` parses named group names from `re.source` via `/\(\?<([^>]+)>/g`. `strPartition`/`strRPartition` overloads for scalar→tuple vs array/Series→DataFrame. `strMultiReplace` uses `.withValues()` to preserve Series index. `strDedent` applies per-element.
- **Iter 146 (pipe_apply)**: `pipe` uses TypeScript overloads for 1-8 fns. `dataFrameApply` axis=1 builds row Series. `dataFrameTransformRows` partial update via `c in rowOut` check. `DataFrame.fromColumns(newData, { index: df.index })` preserves index.
- **Iter 145 (string_ops)**: `strGetDummies` sorted tokens. `strExtractAll` JSON-encodes `string[][]`. `instanceof Series` narrowing avoids `as` casts.
- **Iter 144 (attrs)**: WeakMap registry pattern. `withAttrs<T>` preserves concrete type.
- **Iter 143 (rolling_apply)**: Generator-based `windowIterator` yields `{met, nums, raw}`.
- **Iter 142 (notna_isna)**: Module-level overloads. `_dropnaRows` uses `series.iat(i)`.
- **Iter 141 (where_mask)**: `resolveSeriesCond()` handles boolean[], Series<boolean>, callable.
- **Iter 140 (window_extended)**: `rollingSem`=std/√n. `rollingSkew` Fisher-Pearson. `rollingQuantile` 5 interpolation methods.
- **Iter 139 (cut/qcut)**: Binary search in `assignBins()`. `deduplicateEdges()` for uniform data.
- **Iters 119–138**: `__MISSING__` sentinel. `pctChange`, `rollingSem/Skew/Kurt`, `sampleCov(ddof=1)`, `crossCorr`, `wideToLong` anchored regex, `toDictOriented`/`fromDictOriented`.
- **Iters 53–118**: `Index(data,name?)`. `instanceof` dispatch. GroupBy/merge/str/dt, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, crosstab.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 146)**: 39 files. Next: io/read_excel (zero-dep XLSX) · stats/string_ops_extended

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 147 — 2026-04-09 18:24 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24206383170)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/string_ops_extended.ts` — 7 standalone advanced string operations: `strSplitExpand` (split → DataFrame columns, mirrors `str.split(expand=True)`), `strExtractGroups` (regex capture groups → DataFrame, mirrors `str.extract`), `strPartition` / `strRPartition` (split at first/last sep → tuple or DataFrame), `strMultiReplace` (batch find/replace), `strIndent` / `strDedent` (line-level indentation, mirrors textwrap). 50+ unit tests + 4 property-based tests. Playground page `string_ops_extended.html`.
- **Metric**: 40 (previous best: 39, delta: +1)
- **Commit**: `a78aead`
- **Notes**: Named groups parsed from `re.source` via `/\(\?<([^>]+)>/g`. `strDedent` applies per-element (each element dedented independently). `strMultiReplace` uses `.withValues()` on Series to preserve index.

### Iteration 146 — 2026-04-09 17:52 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24204988345)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/pipe_apply.ts` — 7 exported functions: `pipe` (variadic type-safe pipeline, 8 overloads), `seriesApply` (element-wise with value/label/pos context), `seriesTransform` (scalar→scalar), `dataFrameApply` (column-wise/row-wise aggregation, axis 0/1), `dataFrameApplyMap` (cell-wise, mirrors applymap), `dataFrameTransform` (column-wise transform), `dataFrameTransformRows` (row-wise with partial updates). 50+ unit tests + 4 property-based tests. Playground page `pipe_apply.html`.
- **Metric**: 39 (previous best: 38, delta: +1)
- **Commit**: `3d42458`
- **Notes**: `pipe` overloads preserve precise return types up to 8 steps. `dataFrameTransformRows` partial update pattern (only return keys to change, others kept) is very ergonomic. `DataFrame.fromColumns(data, { index: df.index })` is the right way to preserve row labels when building a new DataFrame.

### Iteration 145 — 2026-04-09 17:27 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24203932812)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/string_ops.ts` — 8 standalone string operation functions: `strNormalize`, `strGetDummies`, `strExtractAll`, `strRemovePrefix`, `strRemoveSuffix`, `strTranslate`, `strCharWidth`, `strByteLength`. 50+ unit tests + 5 property-based tests. Playground page `string_ops.html`.
- **Metric**: 38 (previous best: 37, delta: +1)
- **Commit**: `f906316`

### Iters 139–144 — ✅ (metrics 32→37): cut_qcut, window_extended, where_mask, notna_isna, rolling_apply, attrs
### Iters 103–138 — ✅ (metrics 25→31): insert_pop, to_from_dict/wide_to_long, assign, clip_with_bounds, pivotTableFull, infer_dtype, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align, explode, isin, between, unique/nunique, pct_change, replace, map/transform, read_fwf, mode, autocorr, abs/round, rolling_moments, covariance, rolling_cross_corr, cut_extended, astype, idxminmax, convert_dtypes
### Iters 53–102 — ✅ (metrics 8→24): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
