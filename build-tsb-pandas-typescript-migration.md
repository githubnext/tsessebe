# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-07T11:49:32Z |
| Iteration Count | 126 |
| Best Metric | 81 |
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

**State (iter 126)**: 81 files. Next candidates:
- `src/stats/cut_extended.ts` — pd.cut with `ordered` dtype and per-bin labels
- `src/stats/wide_to_long_enhanced.ts` — wide_to_long with stubvar / i / j options
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/stats/skew_kurt_extended.ts` — rolling skew/kurtosis, Series.skew(skipna), DataFrame.skew(axis)

---

## 📚 Lessons Learned

- **Iter 126 (abs/round)**: `absSeries`/`absDataFrame` — only transform `typeof v === "number" && !Number.isNaN(v)` values; pass everything else through. `roundSeries(s, d)` uses `Number(n.toFixed(d))` for positive d; for negative d uses `Math.round(n / 10^-d) * 10^-d`. DataFrame iteration uses `df.columns.values as string[]` + `df.col(name)` — not `for...of df` (no Symbol.iterator on DataFrame). Per-column dict for roundDataFrame: columns not in dict pass through unchanged.
- **Iter 125 (autocorr)**: `autocorr(series, lag)` = Pearson correlation of `s[lag:]` vs `s[:-lag]`. Negative lags symmetric (|lag| used). Missing/non-numeric values silently dropped per-pair. Lag 0 → 1, zero variance → NaN, |lag|≥n → NaN. No bun available in sandbox — evaluate via find/grep/wc only.
- **Iter 124 (mode)**: `computeMode()` builds a freq-map, finds maxCount, returns all values with that count sorted ascending. `compareForMode()` handles mixed types: numbers < strings < booleans; missing last. DataFrame mode pads shorter columns with `null`. `scalarKey()` maps all missing sentinels to distinct prefixed keys (not `__MISSING__`) for correctness. Bun not available in agent sandbox — use evaluation via `find/grep/wc`.
- **Iter 123 (read_fwf)**: state file was not updated by iter 123 run (77→78 was not reflected). Always re-read git log to find actual HEAD metric before planning.
- **Iter 122 (seriesMap/dataFrameTransform)**: `resolveMapper()` coerces function/Map/dict/Series to a `(v: Scalar) => Scalar` lookup. `naAction="ignore"` only skips NA for function args. `dataFrameTransform` axis=1 rebuilds cols from row results. Dict arg (per-column fn) passes through unlisted columns unchanged.
- **Iter 121 (replace)**: `encodeKey(v)` maps Scalar→string for Map lookup. Missing sentinels: `"null"/"undefined"/"NaN"`. Per-column dict detection: if any top-level value is a plain object. Biome `useBlockStatements` — run `--fix --unsafe`.
- **Iter 120 (pct_change)**: Formula `(x[i]-x[i-p])/|x[i-p]|`. `periods=0`→all-NaN. Use `Map<string, Series<Scalar>>` for DataFrame cols. `Number.NaN` not `NaN`. `import fc from "fast-check"` (default import). Extract sub-helpers if complexity>15.
- **Iter 119 (unique/nunique)**: All missing sentinels map to `"__MISSING__"`. `.chain()` to bind `nrows` in property tests. `import type { DataFrame }` when used only as type parameter.
- **Iters 114–118**: reindex `Index(data,name?)` not `{data}`. nearest-fill O(n). duplicated: `df.has(col)`. searchsorted: left stops at `>=v`, right at `>v`. align: thin wrapper over reindex. between: guard with `isMissing()`. isin: `isIsinDict()` checks `!Array.isArray && !(Set) && !Symbol.iterator`. explode: widen `Scalar[]` to `unknown[]` for `Array.isArray`.
- **Iters 101–113**: select_dtypes: `new DataFrame(new Map(...), rowIndex)`. NamedAgg: `import type` for cross-deps. assign: `_addOrReplaceColumn` preserves order. clip: `resolveBound()` unifies scalar/array/Series. pivotTable: margins from raw data. infer_dtype: `unknown[]` input. notna: `v===null||v===undefined||(isNaN)`.
- **Iters 89–100**: `fc.double` not `fc.float`. `_mod = a-Math.floor(a/b)*b`. `RawTimestamp` sentinel. `tryConvert` returns `{ok,value}`.
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

### Iteration 126 — 2026-04-07 11:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24079727260)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/abs_round.ts` — `absSeries`, `roundSeries`, `absDataFrame`, `roundDataFrame` mirroring `pandas.Series.abs()`, `.round()`, `pandas.DataFrame.abs()`, `.round()`.
- **Metric**: 81 (previous best: 80, delta: +1)
- **Commit**: dfe5449
- **Notes**: Non-numeric values (null/undefined/NaN/strings/booleans) pass through unchanged. `roundSeries(s, d)` uses `Number(n.toFixed(d))` for correct round-half-away-from-zero; negative decimals rounds to tens/hundreds. Per-column precision dict supported for DataFrame. 30 unit + 2 property-based tests.

### Iteration 125 — 2026-04-07 11:22 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24078727612)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/autocorr.ts` — `autocorr(series, lag, options)` Pearson autocorrelation coefficient mirroring `pandas.Series.autocorr(lag)`.
- **Metric**: 80 (previous best: 79, delta: +1)
- **Commit**: 7b8ed12
- **Notes**: Pairs `s[lag:]` with `s[:-lag]`, drops missing/non-numeric pairs, computes Pearson correlation. Negative lags treated symmetrically. 25 unit tests + 5 property-based tests covering arithmetic sequences, periodic signals, missing values, minPeriods, and scale/shift invariance.

### Iteration 124 — 2026-04-07 10:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24077482397)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/mode.ts` — `modeSeries()` (most frequent value(s), sorted) and `modeDataFrame()` (column-wise mode with null padding). Mirrors `pandas.Series.mode()` and `pandas.DataFrame.mode()`.
- **Metric**: 79 (previous best: 78, delta: +1)
- **Commit**: 6e2e5a7
- **Notes**: `computeMode()` builds a freq-map and returns all values at max frequency, sorted ascending via `compareForMode()`. DataFrame mode pads shorter columns with `null`. State file was 2 iterations behind (iter 123 readFwf not recorded); corrected.

### Iteration 123 — 2026-04-07 09:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24075xxx)

- **Status**: ✅ Accepted
- **Change**: Added `src/io/read_fwf.ts` — `readFwf()` fixed-width format reader. Mirrors `pandas.read_fwf()`.
- **Metric**: 78 (previous best: 77, delta: +1)
- **Commit**: 3ca9d3c
- **Notes**: State file was not updated after this run (scheduling anomaly). Corrected in iter 124.

### Iteration 122 — ✅ map/transform (77) · Iteration 121 — ✅ replace (76) · Iteration 120 — ✅ pct_change (75)

### Iters 116–119 — ✅ (metrics 71→74): explode, isin, between, unique/nunique

### Iters 103–115 — ✅ (metrics 58→70): assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align
### Iters 53–102 — ✅ (metrics 8→57): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
