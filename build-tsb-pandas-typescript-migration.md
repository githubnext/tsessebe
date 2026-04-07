# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-07T03:35:46Z |
| Iteration Count | 117 |
| Best Metric | 72 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258` |
| PR | #54 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 72 files (iter 117). Next candidates:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/stats/between.ts` — `Series.between(left, right, inclusive)` membership range test
- `src/stats/wide_to_long_enhanced.ts` — wide_to_long with stubvar / i / j options

---

## 📚 Lessons Learned

- **Iter 117 (isin)**: `isIsinDict()` guard distinguishes plain-object `IsinDict` from `Iterable` values by checking `!Array.isArray && !(instanceof Set) && Symbol.iterator not a function`. NaN never matches even if NaN is in the lookup Set (JS Set uses SameValueZero but we guard with `Number.isNaN` before the set lookup). `boolean extends Scalar` so `boolean[]` is directly assignable to `Scalar[]` without casts; keep `data: Scalar[]` for cleanliness.
- **Iter 116 (explode)**: `Scalar` type does not include arrays, so `Array.isArray(v)` where `v: Scalar` narrows to `never`. Fix: widen to `readonly unknown[]` via implicit assignment (`const w: readonly unknown[] = series.values`) — no cast needed since `readonly Scalar[]` ⊆ `readonly unknown[]` (readonly arrays are covariant). `explodeSeries` accepts `Series<Scalar>` and returns `Series<Scalar>`. `explodeDataFrame` handles both single and multi-column explosion; empty arrays → null row. `Map.get()` returns `T | undefined`, use `!== undefined` guard rather than `as T` cast.
- **Iter 115 (align)**: `alignSeries` and `alignDataFrame` are thin wrappers over `reindexSeries`/`reindexDataFrame` — the heavy lifting is already done. Key design: `resolveIndex()` switches on the `join` policy using `Index.union()`, `.intersection()`, or the original index. For `alignDataFrame`, normalise `axis` to `0 | 1 | null` before branching; `null` aligns both axes. Column indices are `Index<string>` — casting from `Index<Label>` via `as Index<string>` is safe since `resolveIndex` returns the same element type.
- **Iter 114 (reindex)**: `Index` constructor takes `(data: readonly T[], name?)` — NOT `{ data }`. The `toIndex()` helper must call `new Index(src)` directly. Property tests need to ensure data/labels lengths match before constructing a Series. Two-pass `leftDist/rightVal` + `rightDist/rightVal` arrays enable O(n) nearest fill. `applyFfill` increments `streak` in both the "fill applied" and "no prior value" branches to correctly enforce `limit`. `applyNearest` prefers right (forward) on equidistant tie — matching pandas.
- **Iter 113 (duplicated/drop_duplicates)**: `df.has(col)` is the correct method (not `df.hasColumn()`). Row key built by JSON-encoding each cell value with `\x00`-prefixed sentinels for null/NaN to avoid collisions. `computeDuplicateMask()` centralises all three `keep` policies. Test files need `import type { Scalar }` when mixing number/string in a `Map<string, Series<Scalar>>`.
- **Iter 111 (searchsorted)**: Binary search using bisect algorithm. `side="left"` stops at first `a[mid] >= v`; `side="right"` stops at first `a[mid] > v`. NaN treated as greater than all numbers (consistent ordering). `argsortScalars` produces the `sorter` permutation. Internal `bisect()` helper accepts a `get(i)` accessor, making `sorter` support zero-cost (just re-route the accessor). 44 unit tests + 4 property-based tests (insertion preserves sort, left≤right, result in [0,n], sorter≡presorted).
- **Iter 110 (natsort)**: Tokenise strings into alternating text/digit chunks with regex `/(\d+)/g`. Digit tokens compare numerically; text tokens compare lexicographically (optionally case-folded). `natArgSort` pre-computes keys then sorts indices — avoids re-tokenising on every comparison. Property tests (anti-symmetry, permutation correctness, argSort≡sorted) catch corner cases effectively.
- **Iter 109 (combine_first)**: `buildLabelMap(idx)` helper creates `Map<string, number[]>` for O(1) label lookup. `Index.union()` handles the index union cleanly. The key insight: check `isMissing(selfVal)` before falling back to `other`. DataFrame path iterates union rows × union cols — straightforward nested loop with per-column Series construction.
- **Iter 108 (dropna standalone)**: `dropna(series)` dispatches to `s.dropna()`. DataFrame path: `axis=0` pre-fetches column arrays into a `Map` for efficient row scanning. `how='all'` checks `nullCount < checkCols.length`. `thresh` checks `nonNullCount >= thresh`. `subset` filters columns before scanning. `axis=1` scans each column's values. `_selectRows()` builds a boolean mask via `Set<number>` then calls `df.filter()`. `_selectCols()` delegates to `df.select()`. Zero `as` casts needed. 44 tests (unit + property-based).
- **Iter 107 (notna/isna)**: `SeriesOptions.name` is `string | null` (not `string | undefined`) — pass `s.name` directly. The `missing()` helper `v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))` is the canonical missing test. `isnull`/`notnull` are simple `const` aliases. DataFrame overload builds a `Map<string, Series<Scalar>>` with `df.index`.
- **Iter 106 (infer_dtype)**: `inferDtype(values, {skipna})` uses `unknown[]` input type so specialised objects pass type-checks.
- **Iter 105 (pivotTableFull)**: Grand-total margins computed from raw data values. `marginValue()` helper concatenates all buckets for a fixed key across opposite keys.
- **Iter 104 (clip_with_bounds)**: `resolveBound()` helper unifies scalar/array/Series bounds. `Array.isArray` distinguishes arrays from Series at runtime.
- **Iter 103 (dataFrameAssign)**: Callable specifiers receive the in-progress `working` DataFrame. `_addOrReplaceColumn` preserves column order.
- **Iter 102 (NamedAgg)**: Circular value imports avoided by using only `import type` for cross-dependencies.
- **Iter 101 (select_dtypes)**: Use `new DataFrame(new Map(...), rowIndex)` directly to preserve custom dtypes.
- **Iters 89–100**: Use `fc.double` not `fc.float`. `_mod = a - Math.floor(a/b)*b`. `RawTimestamp` sentinel avoids JS `#` private field breakage. `tryConvert` returns discriminated union `{ok,value}`.
- **Iters 53–88**: GroupBy/merge/str/dt, describe, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, get_dummies, crosstab.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 117)**: 72 files. Next: io/read_excel (XLSX zero-dep) · stats/between · stats/wide_to_long_enhanced

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 117 — 2026-04-07 03:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24062941194)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/isin.ts` — `isin(series, values)` and `dataFrameIsin(df, values)` mirroring `pandas.Series.isin` / `pandas.DataFrame.isin`.
- **Metric**: 72 (previous: 71, delta: +1)
- **Commit**: 3b29902
- **Notes**: `isIsinDict()` guard distinguishes plain-object per-column dicts from iterables (array/Set/generator) without unsafe casts. NaN never matches (like pandas). 44 unit tests + 5 property-based tests covering both Series and DataFrame paths.

### Iteration 116 — 2026-04-07 02:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24061009779)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/explode.ts` — `explodeSeries` and `explodeDataFrame` mirroring `pandas.Series.explode` / `pandas.DataFrame.explode`.
- **Metric**: 71 (previous: 70, delta: +1)
- **Commit**: e700bbb
- **Notes**: Array elements expand into individual rows; scalars/null stay as single rows; empty arrays → null row. `readonly Scalar[]` widened to `readonly unknown[]` (covariant) to enable `Array.isArray` narrowing without unsafe casts. 40 unit tests + 4 property-based tests.

### Iters 103–115 — ✅ (metrics 58→70): assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align
### Iters 53–102 — ✅ (metrics 8→57): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
