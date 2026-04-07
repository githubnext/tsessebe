# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-07T14:37:00Z |
| Iteration Count | 130 |
| Best Metric | 85 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258` |
| PR | #54 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**State (iter 130)**: 85 files. Next candidates:
- `src/stats/wide_to_long_enhanced.ts` — wide_to_long with stubvar / i / j options
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/stats/cut_qcut_retbins_playground.ts` — playground page for cut_extended

---

## 📚 Lessons Learned

- **Iter 130 (cut_extended)**: `cutWithBins`/`qcutWithBins` return `{result, bins}` for retbins. `cutOrdered`/`qcutOrdered` return `{result, categories, ordered:true, bins}`. `compareCategories(a,b,cats)` → neg/zero/pos; null < any. `sortByCategory`. Property: antisymmetric, non-decreasing.
- **Iter 129 (rolling_cross_corr)**: `crossCorr(x,y,{lags})` — pairs (x[i],y[i-l]). Lag fmt: `l<0→"lag_neg{|l|}"`. Symmetry: crossCorr(x,y,l)==crossCorr(y,x,-l).
- **Iter 128 (covariance)**: `pairedNums()` per window + `sampleCov(ddof=1)`. Zero var → NaN. Scale-invariant.
- **Iter 127 (rolling_moments)**: `rollingSkew` Fisher-Pearson (n≥3), `rollingKurtosis` bias-corrected (n≥4). `new Series<Scalar>({data,index,name})`.
- **Iter 126 (abs/round)**: only transform `typeof v==="number"&&!isNaN(v)`. `Number(n.toFixed(d))`. `df.columns.values as string[]` + `df.col(name)`.
- **Iter 125 (autocorr)**: Pearson of `s[lag:]` vs `s[:-lag]`. Lag 0 → 1, zero var → NaN, |lag|≥n → NaN. No bun in sandbox.
- **Iter 124 (mode)**: freq-map → maxCount → sorted. `scalarKey()` distinct prefixed keys for missing.
- **Iters 119–123**: `__MISSING__` sentinel. `resolveMapper()` coerces fn/Map/dict. `encodeKey` missing→"null/undefined/NaN". `pctChange`: `(x[i]-x[i-p])/|x[i-p]|`.
- **Iters 114–118**: `Index(data,name?)`. duplicated: `df.has(col)`. isin: `!Array.isArray&&!Set&&!Symbol.iterator`. explode: `unknown[]`.
- **Iters 101–113**: `new DataFrame(new Map(...), rowIndex)`. `_addOrReplaceColumn`. `resolveBound()`. notna: `===null||===undefined||isNaN`.
- **Iters 89–100**: `fc.double`. `_mod = a-floor(a/b)*b`. `RawTimestamp`. `tryConvert→{ok,value}`.
- **Iters 53–88**: GroupBy/merge/str/dt, describe, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, get_dummies, crosstab.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 126)**: 81 files. Next: stats/cut_extended (ordered dtype + per-bin labels) · stats/wide_to_long_enhanced · io/read_excel (zero-dep XLSX)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 130 — 2026-04-07 14:37 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24087093397)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/cut_extended.ts` — `cutWithBins`/`qcutWithBins` (retbins), `cutOrdered`/`qcutOrdered` (ordered categorical), `compareCategories`, `sortByCategory`.
- **Metric**: 85 (previous best: 84, delta: +1)
- **Commit**: 4171a1e
- **Notes**: mirrors pandas `cut(retbins=True)` and `CategoricalDtype(ordered=True)`. `compareCategories` is antisymmetric (property test). `sortByCategory` produces non-decreasing sequences. Self-contained module duplicating cut.ts helpers.

### Iteration 129 — 2026-04-07 13:34 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24084133215)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/rolling_cross_corr.ts` — `crossCorr` and `rollingCrossCorr` implementing Pearson cross-correlation at multiple lags.
- **Metric**: 84 (previous best: 83, delta: +1)
- **Commit**: 03559cc
- **Notes**: `crossCorr` returns Series indexed by lag labels; `rollingCrossCorr` returns DataFrame (rows=time, cols=lag). Lag semantics: lag l → pairs (x[i], y[i-l]). Symmetry: crossCorr(x,y,l) == crossCorr(y,x,-l). Property tests: bounds [−1,1], self-corr = 1 or NaN, row count invariant.

### Iteration 128 — 2026-04-07 12:50 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24082160028)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/covariance.ts` — `rollingCov`, `rollingCorr`, `rollingCovDataFrame`, `rollingCorrDataFrame` mirroring `pandas.Series.rolling(n).cov(other)` / `.corr(other)`.
- **Metric**: 83 (previous best: 82, delta: +1)
- **Commit**: 784e6ee
- **Notes**: `pairedNums()` extracts positionally-aligned valid pairs per window. `rollingCorr` returns NaN for zero-variance windows. DataFrames use column-wise dispatch. Scale-invariance, commutativity, and bounds [−1,1] verified with fast-check property tests.

### Iteration 127 — 2026-04-07 12:22 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24080990847)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/rolling_moments.ts` — `rollingSkew`, `rollingKurtosis`, `rollingSkewDataFrame`, `rollingKurtosisDataFrame` mirroring `pandas.Series.rolling(n).skew()` / `.kurt()`
- **Metric**: 82 (previous best: 81, delta: +1)
- **Commit**: 4eef894
- **Notes**: Fisher-Pearson adjusted skew (n≥3) and bias-corrected excess kurtosis (n≥4). `minPeriods` defaults to statistical minimum. Scale/shift-invariant properties verified with fast-check.

### Iteration 126 — ✅ abs/round (81) · Iteration 125 — ✅ autocorr (80)

### Iteration 124 — ✅ mode (79) · Iteration 123 — ✅ read_fwf (78)

### Iteration 122 — ✅ map/transform (77) · Iteration 121 — ✅ replace (76) · Iteration 120 — ✅ pct_change (75)

### Iters 116–119 — ✅ (metrics 71→74): explode, isin, between, unique/nunique

### Iters 103–115 — ✅ (metrics 58→70): assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align
### Iters 53–102 — ✅ (metrics 8→57): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
