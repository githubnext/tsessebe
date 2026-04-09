# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-09T09:31:10Z |
| Iteration Count | 143 |
| Best Metric | 36 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #81 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**State (iter 143)**: 36 files on PR #81 branch. rollingApply/rollingAgg standalone module added. Next priorities:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/attrs.ts` — DataFrame/Series `.attrs` dict (user-defined metadata)
- `src/stats/string_ops.ts` — str accessor vectorized ops (startswith, endswith, contains, extract)

---

## 📚 Lessons Learned

- **Iter 143 (rolling_apply)**: `rollingApply` standalone with `minPeriods`/`center`/`raw` options. `rollingAgg` applies multiple named fns in one pass → DataFrame. `dataFrameRollingAgg` flattens to `{col}_{aggName}` columns. Generator-based `windowIterator` yields `{met, nums, raw}` per position. TypeScript generator with explicit yield type works cleanly.
- **Iter 142 (notna_isna)**: Module-level `isna`/`notna`/`isnull`/`notnull` via TypeScript overloads. `fillna`/`dropna` dispatch by `instanceof`. `_dropnaRows` uses `series.iat(i)`. `countna`/`countValid` avoid intermediate Series allocation.
- **Iter 141 (where_mask)**: `resolveSeriesCond()` handles boolean[], Series<boolean>, callable. `resolveDataFrameCond()` aligns by column name + row label. `df.columns.values` (string[]) not `df.columns` (Index) for typed keys.
- **Iter 140 (window_extended)**: `rollingSem`=std/√n (n≥2). `rollingSkew` Fisher-Pearson (n≥3), constant→0. `rollingKurt` (n≥4). `rollingQuantile` 5 interpolation methods. Standalone module pattern.
- **Iter 139 (cut/qcut)**: Binary search in `assignBins()`. `qcut` uses right=true/include_lowest=true. Integer bins: edges[0] below min. `deduplicateEdges()` for uniform data.
- **Iter 138 (to_from_dict + wide_to_long)**: PR #81 branch state verification needed. `wideToLong` anchored regex for `{stub}{sep}{suffix}`. Suffixes sorted numerically then lexicographically.
- **Iters 131–135**: `insertColumn` rebuilds ordered Map. `idxmin/idxmax` `lessThan`/`greaterThan` helpers. `castOne(v, dt)` for astype. `inferBestDtype` checks bool before int.
- **Iters 119–130**: `__MISSING__` sentinel. `pctChange`: `(x[i]-x[i-p])/|x[i-p]|`. `rollingSem/Skew/Kurt`. `sampleCov(ddof=1)`. `crossCorr(x,y,lags)`. No bun in sandbox.
- **Iters 53–118**: `Index(data,name?)`. `instanceof` dispatch pattern. GroupBy/merge/str/dt, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, crosstab. `fc.double`. `RawTimestamp`.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 143)**: 36 files. Next: io/read_excel (zero-dep XLSX) · core/attrs (metadata dict) · stats/string_ops standalone

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 143 — 2026-04-09 09:31 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24182985389)

- **Status**: ✅ Accepted
- **Change**: Added `src/window/rolling_apply.ts` — `rollingApply`, `rollingAgg`, `dataFrameRollingApply`, `dataFrameRollingAgg`. 40+ unit tests + 3 property-based tests. Playground page `rolling_apply.html`.
- **Metric**: 36 (previous best: 35, delta: +1)
- **Commit**: `10a90ae`
- **Notes**: Standalone module complementing the existing `Rolling.apply` method with multi-aggregation support. `rollingAgg` is the key addition — applies multiple named functions in a single window pass, returning a DataFrame. `dataFrameRollingAgg` produces `{col}_{aggName}` columns for full cross-product coverage.

### Iteration 142 — 2026-04-09 07:43 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24178594390)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/notna_isna.ts` — `isna`, `notna`, `isnull`, `notnull`, `fillna`, `dropna`, `countna`, `countValid`. All overloaded for scalar/array/Series/DataFrame. DataFrame `dropna` supports `how="any"|"all"` and `axis=0|1`. 50+ unit tests + 3 property-based tests. Playground page `notna_isna.html`.
- **Metric**: 35 (previous best: 34, delta: +1)
- **Commit**: `731c81a`
- **Notes**: Standalone module mirrors pandas' `pd.isna()`/`pd.notna()` top-level API. TypeScript overloads dispatch cleanly on instanceof checks. `_dropnaRows` uses `series.iat(i)` for positional access and rebuilds index from kept positions.

### Iteration 141 — 2026-04-09 07:01 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24177038823)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/where_mask.ts` — `seriesWhere`, `seriesMask`, `dataFrameWhere`, `dataFrameMask`. Supports boolean arrays, label-aligned Series/DataFrame, and callables. 37 unit tests + 3 property-based tests. Playground page `where_mask.html`.
- **Metric**: 34 (previous best: 33, delta: +1)
- **Commit**: `8ef2d4e`
- **Notes**: `where` keeps values where cond=true; `mask` is exact inverse. All four functions are pure. Label alignment via `.indexOf()` on index.values. DataFrame ops use `df.columns.values` (string[]) for type safety.

### Iteration 140 — 2026-04-09 05:17 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24173724265)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/window_extended.ts` — `rollingSem`, `rollingSkew`, `rollingKurt`, `rollingQuantile`. 35+ unit tests + 3 property-based tests. Playground page `window_extended.html`.
- **Metric**: 33 (previous best: 32, delta: +1)
- **Commit**: `c02f7cf`
- **Notes**: Standalone module with shared `applyWindow()` helper. Skew/kurt special-case `std=0` → return 0. `rollingQuantile` supports 5 interpolation methods (linear/lower/higher/midpoint/nearest).

### Iteration 139 — 2026-04-09 04:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24172139030)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/cut_qcut.ts` — `cut()` and `qcut()`. Metric: 32 (+1).
- **Commit**: `7210f1f`

### Iters 103–140 — ✅ (metrics 25→33): insert_pop, to_from_dict/wide_to_long, cut_qcut, window_extended, assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align, explode, isin, between, unique/nunique, pct_change, replace, map/transform, read_fwf, mode, autocorr, abs/round, rolling_moments, covariance, rolling_cross_corr, cut_extended, astype, idxminmax, convert_dtypes
### Iters 53–102 — ✅ (metrics 8→24): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
