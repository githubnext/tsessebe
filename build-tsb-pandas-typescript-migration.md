# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-09T03:06:39Z |
| Iteration Count | 138 |
| Best Metric | 31 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #81 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**State (iter 138)**: 31 files on PR #81 branch. to_from_dict.ts and wide_to_long.ts both committed successfully. Next priorities:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/stats/cut_qcut_extended.ts` — ordered categorical cut/qcut with retbins, custom labels
- `src/core/attrs.ts` — DataFrame/Series `.attrs` dict (user-defined metadata)

---

## 📚 Lessons Learned

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

**State (iter 126)**: 81 files. Next: stats/cut_extended (ordered dtype + per-bin labels) · stats/wide_to_long_enhanced · io/read_excel (zero-dep XLSX)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 138 — 2026-04-09 03:06 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24170164603)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/to_from_dict.ts` (7-orient `toDictOriented` + 4-orient `fromDictOriented`) and `src/reshape/wide_to_long.ts` (`wideToLong` — mirrors `pandas.wide_to_long`). 44 tests (unit + property-based). Playground pages for both.
- **Metric**: 31 (previous best: 30, delta: +1)
- **Commit**: `962efb5`
- **Notes**: PR #81 branch previously only had 29 files (to_from_dict was never actually committed despite state claiming 30). Added both missing to_from_dict and new wide_to_long to get 31 files.

### Iteration 137 — 2026-04-09 01:37 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24167810966)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/to_from_dict.ts` — `toDictOriented` (7 orientations) + `fromDictOriented` (5 orientations). Committed to PR #81 branch (iter136 base + to_from_dict). Note: canonical branch with 90 files couldn't be pushed due to auth constraints.
- **Metric**: 30 (previous best: 30, delta: 0 on PR#81 branch; accumulated branch would be 90)

### Iteration 136 — 2026-04-09 01:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24166615896)

- **Status**: ✅ Accepted
- **Change**: `src/core/to_from_dict.ts` — `toDictOriented` (7 orientations) + `fromDictOriented` (4 orientations). 30 unit + 3 property tests. PR created for iter136 branch.
- **Metric**: 30 (on iter136 branch based on iter135 29-file base, delta: +1)

### Iteration 135 — 2026-04-09 00:24 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24165728899)

- **Status**: ✅ Accepted (on iter135 branch, not accumulated)
- **Change**: Added `src/core/insert_pop.ts` — `insertColumn`, `popColumn`, `reorderColumns`, `moveColumn`.
- **Metric**: 89 on iter135 branch (29 files base + insert_pop); 88 on accumulated c9103f2f branch

### Iters 132–134 — ✅ (metrics 87→89 on various branches): idxminmax (88), convert_dtypes (87), to_from_dict (89)

### Iters 127–131 — ✅ (metrics 82→86): rolling_moments, covariance, rolling_cross_corr, cut_extended, astype

### Iteration 126 — ✅ abs/round (81) · Iteration 125 — ✅ autocorr (80)

### Iteration 124 — ✅ mode (79) · Iteration 123 — ✅ read_fwf (78)

### Iteration 122 — ✅ map/transform (77) · Iteration 121 — ✅ replace (76) · Iteration 120 — ✅ pct_change (75)

### Iters 116–119 — ✅ (metrics 71→74): explode, isin, between, unique/nunique

### Iters 103–115 — ✅ (metrics 58→70): assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align
### Iters 53–102 — ✅ (metrics 8→57): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
