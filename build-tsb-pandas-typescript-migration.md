# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-09T07:01:40Z |
| Iteration Count | 141 |
| Best Metric | 34 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #81 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**State (iter 141)**: 34 files on PR #81 branch. where_mask added (seriesWhere/seriesMask/dataFrameWhere/dataFrameMask with callable conditions). Next priorities:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/attrs.ts` — DataFrame/Series `.attrs` dict (user-defined metadata)
- `src/stats/notna_isna.ts` — notna/isna/fillna/dropna standalone functions

---

## 📚 Lessons Learned

- **Iter 141 (where_mask)**: `resolveSeriesCond()` handles three cond types: `boolean[]` (positional), `Series<boolean>` (label-aligned via `.indexOf()`), callable (returns either). `resolveDataFrameCond()` aligns boolean DataFrame by column name + row label, missing entries → false. `dataFrameWhere/Mask` iterate `df.columns.values` (string[]) not `df.columns` (Index) to get typed string keys. `Map<string, boolean[]>` in resolveDataFrameCond to avoid Label cast issues.
- **Iter 140 (window_extended)**: `rollingSem` = `std(ddof=1)/sqrt(n)`, requires n≥2. `rollingSkew` Fisher-Pearson formula, constant window→0, requires n≥3. `rollingKurt` Fisher excess kurtosis, constant→0, requires n≥4. `rollingQuantile` supports 5 interpolation methods; linear is pandas default. All share `applyWindow()` helper with configurable `minN`. Standalone module pattern (no modification to existing rolling.ts).
- **Iter 139 (cut/qcut)**: `assignBins()` binary search: for right=true, find smallest i where v <= edges[i+1]; validate with v > binLo check. For right=false, find smallest i where edges[i+1] > v; last bin includes right edge. `qcut` always uses right=true/include_lowest=true. Integer bins: edges[0] slightly below min (mn - step*0.001) to include minimum value. `deduplicateEdges()` needed for uniform data with qcut.
- **Iter 138 (to_from_dict + wide_to_long)**: PR #81 branch had only 29 files despite state claiming 30 — to_from_dict was never actually pushed. Fixed by adding both. `wideToLong`: `collectSuffixes()` scans all column names, matches `{stub}{sep}{suffix}` against anchored regex. Suffixes sorted numerically (integers) else lexicographically. Missing wide columns → null. Output column order: id cols, j, stub cols.
- **Iter 135 (insert_pop)**: `insertColumn(df, loc, col, values)` rebuilds the ordered column Map inserting when `idx === loc`. `popColumn` iterates columns skipping the target, returns `{series, df}`. `reorderColumns` subsets. `moveColumn` wraps pop+insert. All non-mutating.
- **Iter 133 (idxmin/idxmax)**: `findExtremumLabel(series, mode, skipna)` scans values with `lessThan`/`greaterThan` helpers (number, string, boolean, Date). First occurrence wins ties. skipna=false returns label of first missing. DataFrame axis 0: per-column; axis 1: per-row.
- **Iter 132 (convert_dtypes)**: `inferBestDtype()` checks allBool→bool, allInt→int64, allFloat→float64, allStr→string, else object. Bool checked before int. `castValue()` dispatches by dtype.
- **Iter 131 (astype)**: `castOne(v, dt)`. `errors='raise'|'ignore'`. `dataFrameAstype` accepts single dtype or per-column `Record<col,dtype>`.
- **Iter 130 (cut_extended)**: `cutWithBins`/`qcutWithBins` return `{result, bins}` for retbins. `cutOrdered`/`qcutOrdered` return `{result, categories, ordered:true, bins}`.
- **Iters 127–129**: `rollingSkew` Fisher-Pearson (n≥3), `rollingKurtosis` (n≥4). `sampleCov(ddof=1)`. `crossCorr(x,y,lags)`. No bun in sandbox.
- **Iter 126 (abs/round)**: only transform `typeof v==="number"&&!isNaN(v)`. `Number(n.toFixed(d))`.
- **Iter 124 (mode)**: freq-map → maxCount → sorted. `scalarKey()` distinct prefixed keys for missing.
- **Iters 119–123**: `__MISSING__` sentinel. `resolveMapper()`. `pctChange`: `(x[i]-x[i-p])/|x[i-p]|`.
- **Iters 101–118**: `Index(data,name?)`. isin/explode/duplicated. `new DataFrame(new Map(...), rowIndex)`. `resolveBound()`. notna: `===null||===undefined||isNaN`.
- **Iters 53–100**: GroupBy/merge/str/dt, describe, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, crosstab. `fc.double`. `RawTimestamp`.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 141)**: 34 files. Next: io/read_excel (zero-dep XLSX) · core/attrs (metadata dict) · stats/notna_isna standalone

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

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
- **Change**: Added `src/stats/cut_qcut.ts` — `cut()` (fixed-width/explicit bins) and `qcut()` (quantile-based). `BinResult { codes, labels, bins }`. Full options: `labels`, `right`, `include_lowest`, `precision`, `duplicates`. 30+ unit tests + 2 property-based tests. Playground page `cut_qcut.html`.
- **Metric**: 32 (previous best: 31, delta: +1)
- **Commit**: `7210f1f`
- **Notes**: Binary search in `assignBins()` correctly handles all edge cases (include_lowest, right=false last bin). qcut always uses right=true with left-closed first bin (pandas semantics).

### Iters 135–140 — ✅ (metrics 29→33): insert_pop (29), to_from_dict/wide_to_long (31), cut_qcut (32), window_extended (33)

### Iters 103–134 — ✅ (metrics 58→88): assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align, explode, isin, between, unique/nunique, pct_change, replace, map/transform, read_fwf, mode, autocorr, abs/round, rolling_moments, covariance, rolling_cross_corr, cut_extended, astype, idxminmax, convert_dtypes, idxminmax
### Iters 53–102 — ✅ (metrics 8→57): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
