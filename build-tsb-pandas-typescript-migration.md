# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-09T21:48:04Z |
| Iteration Count | 152 |
| Best Metric | 45 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #81 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**State (iter 152)**: 45 files on PR #81 branch. interval_ops + sparse_ops added. Next priorities:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/accessor_extended.ts` — extended accessor methods for dt/str/cat
- `src/stats/hash_ops.ts` — hash/hashing utilities (pd.util.hash_pandas_object)

---

## 📚 Lessons Learned

- **Iter 152 (interval_ops + sparse_ops)**: Two modules added in one iteration. `SparseArray` uses `(indices, values)` compact representation with O(log n) `sparseGet` via binary search. `sparseConcat` requires matching fill values — runtime check needed. `intervalOverlaps` touching endpoints require explicit `===` guard before general overlap test.
- **Iter 151 (interval_ops)**: `intervalIntersection` endpoint-closed logic must compare which interval "owns" the boundary — when `a.right < b.right`, `a` determines if `right` is closed; `b` has it interior. Point intervals `{left=right, closed≠"both"}` are empty. `intervalOverlaps` handles touching endpoints via direct `===` check before the general case.
- **Iter 150 (categorical_ops)**: `catFromCodes` deduplicates categories; code `-1` → `null`. Set ops delegate to `cat.setCategories()`. `catCrossTab` uses `DataFrame.fromColumns`. `catRecode` dispatches on `typeof mapping === "function"`. `new DataFrame(colMap, index)` ≠ `DataFrame.fromColumns` — use static factory.
- **Iter 149 (api_types)**: `isScalar` — primitives + Date only. `isFloat` — finite number with fractional part. `isComplexDtype` always false (JS has no complex type). `isExtensionArrayDtype` = string|object|datetime|timedelta|category.
- **Iters 140–148**: `rollingSem`=std/√n. `rollingSkew` Fisher-Pearson. `linspace` pins last element to exact `stop`. `arange` accumulation avoids float drift. `strSplitExpand` n<0→unlimited. `pipe` 8 TypeScript overloads. `strGetDummies` sorted tokens. WeakMap attrs pattern.
- **Iters 119–139**: `__MISSING__` sentinel. `pctChange`, `rollingSem/Skew/Kurt`, `sampleCov(ddof=1)`, `crossCorr`, `wideToLong` anchored regex, `toDictOriented`/`fromDictOriented`, Binary search in `assignBins()`, `resolveSeriesCond()` handles boolean[]/Series<boolean>/callable.
- **Iters 53–118**: `Index(data,name?)`. `instanceof` dispatch. GroupBy/merge/str/dt, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, crosstab.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 152)**: 45 files. Next: io/read_excel (zero-dep XLSX) · core/accessor_extended · stats/hash_ops

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 152 — 2026-04-09 21:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24214932952)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/interval_ops.ts` (19 functions: makeInterval, intervalContains, intervalOverlaps, intervalIsEmpty, intervalEquals, intervalLength, intervalMidpoint, intervalToString, intervalUnion, intervalIntersection, fromBreaks, fromArrays, indexGet, indexGetIndexer, overlappingPairs, sortIntervals, mergeIntervals, coverageLength, intervalsFromBins) + `src/stats/sparse_ops.ts` (16 functions: sparseFromDense, sparseToDense, sparseGet, sparseFillValue, sparseDensity, sparseNnz, sparseAdd, sparseMul, sparseUnaryNeg, sparseSlice, sparseFillna, sparseToSeries, sparseFromSeries, sparseMap, sparseFilter, sparseConcat). Full tests + playground pages for both.
- **Metric**: 45 (previous best: 44, delta: +1)
- **Commit**: `3db5d29`
- **Notes**: Two modules added in one iteration to beat the best metric (43→45). The iter136 branch was missing interval_ops (supposedly added in iter 151 on a missing branch), so both were added together.

### Iteration 151 — 2026-04-09 21:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24213802069)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/interval_ops.ts` — 19 Interval/IntervalIndex functions: `makeInterval`, `intervalContains`, `intervalOverlaps`, `intervalIsEmpty`, `intervalEquals`, `intervalLength`, `intervalMidpoint`, `intervalToString`, `intervalUnion`, `intervalIntersection`, `fromBreaks`, `fromArrays`, `indexGet`, `indexGetIndexer`, `overlappingPairs`, `sortIntervals`, `mergeIntervals`, `coverageLength`, `intervalsFromBins`. 72 unit tests + 4 property tests.
- **Metric**: 44 (previous best: 43, delta: +1)
- **Commit**: `f25a0c6`

### Iteration 150 — 2026-04-09 20:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24212535793)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/categorical_ops.ts` — 10 standalone categorical helpers: `catFromCodes`, `catUnionCategories`, `catIntersectCategories`, `catDiffCategories`, `catEqualCategories`, `catSortByFreq`, `catToOrdinal`, `catFreqTable`, `catCrossTab` (w/ margins/normalize), `catRecode`. 55 unit tests + 4 property tests.
- **Metric**: 43 (previous best: 42, delta: +1)
- **Commit**: `cf20436`

### Iteration 149 — 2026-04-09 19:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24209242279)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/api_types.ts` — 31 runtime type-checking predicates (16 value-level + 15 dtype-level), mirroring `pandas.api.types`. 60+ unit tests + 3 property tests.
- **Metric**: 42 (previous best: 41, delta: +1)
- **Commit**: `fdd70ce`

### Iters 103–148 — ✅ (metrics 25→41): numeric_extended, string_ops_extended, pipe_apply, string_ops, attrs, rolling_apply, notna_isna, where_mask, window_extended, cut_qcut + many more
### Iters 53–102 — ✅ (metrics 8→24): Foundation, GroupBy, merge, str/dt, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, crosstab
### Iterations 1–52 — ✅ Earlier work on diverged branches
