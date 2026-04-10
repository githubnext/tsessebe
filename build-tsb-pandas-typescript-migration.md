# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-10T00:30:00Z |
| Iteration Count | 155 |
| Best Metric | 48 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #81 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**State (iter 155)**: 48 files on PR #81 branch. sample_stats + boolean_ops + datetime_ops + missing_ops + string_search added. Next priorities:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/accessor_extended.ts` — extended accessor methods for dt/str/cat
- `src/stats/rank_ops.ts` — rank, argsort, nsmallest, nlargest

---

## 📚 Lessons Learned

- **Iter 155 (sample_stats + boolean_ops + datetime_ops + missing_ops + string_search)**: Five modules added (43→48). `df.columns` is `Index<string>` not array → use `.values` for array methods. `DataFrame.fromColumns(data, { index: df.index })` takes `DataFrameOptions` not bare index. `new Index<Label>(arr)` takes `T[]` not `Index<T>`. Generic helpers returning `Series<T>` need `T extends Scalar`. Business day range correctly skips Sat/Sun. Linear interpolation handles leading/trailing NaN correctly.
- **Iter 153 (interval_ops + sparse_ops + hash_ops)**: Three modules in one iteration (43→46). `intervalIntersection` endpoint-closure logic derived from which interval "owns" each endpoint. `SparseArray.sparseGet` uses O(log n) binary search over sorted indices. `hashScalar` uses FNV-1a 32-bit; `hashCombine` uses boost-style mixing. The iter136 branch had 43 files (not 45 as claimed by state), so three new modules were needed to beat best_metric=45.
- **Iter 152 (interval_ops + sparse_ops)**: Two modules added in one iteration. `SparseArray` uses `(indices, values)` compact representation with O(log n) `sparseGet` via binary search. `sparseConcat` requires matching fill values — runtime check needed. `intervalOverlaps` touching endpoints require explicit `===` guard before general overlap test.
- **Iter 151 (interval_ops)**: `intervalIntersection` endpoint-closed logic must compare which interval "owns" the boundary — when `a.right < b.right`, `a` determines if `right` is closed; `b` has it interior. Point intervals `{left=right, closed≠"both"}` are empty. `intervalOverlaps` handles touching endpoints via direct `===` check before the general case.
- **Iter 150 (categorical_ops)**: `catFromCodes` deduplicates categories; code `-1` → `null`. Set ops delegate to `cat.setCategories()`. `catCrossTab` uses `DataFrame.fromColumns`. `catRecode` dispatches on `typeof mapping === "function"`. `new DataFrame(colMap, index)` ≠ `DataFrame.fromColumns` — use static factory.
- **Iter 149 (api_types)**: `isScalar` — primitives + Date only. `isFloat` — finite number with fractional part. `isComplexDtype` always false (JS has no complex type). `isExtensionArrayDtype` = string|object|datetime|timedelta|category.
- **Iters 140–148**: `rollingSem`=std/√n. `rollingSkew` Fisher-Pearson. `linspace` pins last element to exact `stop`. `arange` accumulation avoids float drift. `strSplitExpand` n<0→unlimited. `pipe` 8 TypeScript overloads. `strGetDummies` sorted tokens. WeakMap attrs pattern.
### Iters 119–139 — ✅: `__MISSING__` sentinel. `pctChange`, `rollingSem/Skew/Kurt`, `sampleCov(ddof=1)`, `crossCorr`, `wideToLong` anchored regex, `toDictOriented`/`fromDictOriented`, Binary search in `assignBins()`, `resolveSeriesCond()` handles boolean[]/Series<boolean>/callable.
### Iters 53–118 — ✅: `Index(data,name?)`. `instanceof` dispatch. GroupBy/merge/str/dt, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, crosstab.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 155)**: 48 files. Next: io/read_excel (zero-dep XLSX) · core/accessor_extended · stats/rank_ops (rank, argsort, nsmallest, nlargest)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 155 — 2026-04-10 00:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24218902630)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/sample_stats.ts` (9 fns: skew, kurt, SEM, MAD, tmean, harmonicMean, geometricMean, dataFrameSkew, dataFrameKurt), `src/stats/boolean_ops.ts` (11 fns: any, all, countTrue, between, isin, + DataFrame variants), `src/stats/datetime_ops.ts` (11 fns: dateRange, bdateRange, isWeekend, isBusinessDay, addBusinessDays, businessDaysBetween, dateOffset, dateDiff, dateFloor, dateCeil, toDatetime), `src/stats/missing_ops.ts` (10 fns: countNa, naRatio, fillnaMean, fillnaMedian, forwardFillLimit, backFillLimit, interpolateLinear, interpolateNearest, interpolatePad, dropNaThresh), `src/stats/string_search.ts` (11 fns: strContains, strMatch, strFullMatch, strFind, strRFind, strCount, strCenter, strZfill, strPad, strStartsWith, strEndsWith). Full tests + playground pages for all 5.
- **Metric**: 48 (previous best: 47, delta: +1)
- **Commit**: `01adc89`
- **Notes**: `df.columns` is `Index<string>` not array → must use `.values`; `DataFrame.fromColumns` takes `DataFrameOptions` as second arg; generic Series return types need `T extends Scalar` constraint.

### Iteration 154 — 2026-04-09 23:05 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24217011821)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/interval_ops.ts` (19 functions), `src/stats/sparse_ops.ts` (16 functions), `src/stats/hash_ops.ts` (9 functions), `src/stats/clip_ops.ts` (7 functions — clipLower, clipUpper, clipByPercentile, winsorize, clipByIQR, tanhScaling, robustScale). 123 tests all pass.
- **Metric**: 47 (previous best: 46, delta: +1)
- **Commit**: `7fad35c`
- **Notes**: Created canonical `autoloop/build-tsb-pandas-typescript-migration` branch from iter136 (43 files). sparseFillna must update fillValue directly. (0,5] and [5,10) DO overlap at point 5. DataFrame.fromColumns() required. fc.integer instead of fc.float for property tests.

### Iteration 153 — 2026-04-09 22:16 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24215990788)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/interval_ops.ts` (19 functions), `src/stats/sparse_ops.ts` (16 functions), `src/stats/hash_ops.ts` (9 functions — FNV-1a hashScalar, hashArray, hashIndex, hashCombine, hashSeries, hashRows, hashDataFrame, objectHash, hashPandasObject). Full tests and playground pages for all three.
- **Metric**: 46 (previous best: 45, delta: +1)
- **Commit**: `e446c5b`
- **Notes**: Iter136 branch had 43 actual files vs claimed best of 45, so 3 modules were needed to beat the threshold. interval_ops and sparse_ops re-added (prior commits lost) plus new hash_ops module.

### Iteration 152 — 2026-04-09 21:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24214932952)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/interval_ops.ts` (19 functions: makeInterval, intervalContains, intervalOverlaps, intervalIsEmpty, intervalEquals, intervalLength, intervalMidpoint, intervalToString, intervalUnion, intervalIntersection, fromBreaks, fromArrays, indexGet, indexGetIndexer, overlappingPairs, sortIntervals, mergeIntervals, coverageLength, intervalsFromBins) + `src/stats/sparse_ops.ts` (16 functions: sparseFromDense, sparseToDense, sparseGet, sparseFillValue, sparseDensity, sparseNnz, sparseAdd, sparseMul, sparseUnaryNeg, sparseSlice, sparseFillna, sparseToSeries, sparseFromSeries, sparseMap, sparseFilter, sparseConcat). Full tests + playground pages for both.
- **Metric**: 45 (previous best: 44, delta: +1)
- **Commit**: `3db5d29`
- **Notes**: Two modules added in one iteration to beat the best metric (43→45). The iter136 branch was missing interval_ops (supposedly added in iter 151 on a missing branch), so both were added together.

### Iters 149–154 — ✅ (metrics 42→47): api_types (31 predicates), categorical_ops (10 fns), interval_ops (19 fns), sparse_ops (16 fns), hash_ops (9 fns), clip_ops (7 fns)
### Iters 103–148 — ✅ (metrics 25→41): numeric_extended, string_ops_extended, pipe_apply, string_ops, attrs, rolling_apply, notna_isna, where_mask, window_extended, cut_qcut + more
### Iters 53–102 — ✅ (metrics 8→24): Foundation, GroupBy, merge, str/dt, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut
### Iterations 1–52 — ✅ Earlier work on diverged branches
