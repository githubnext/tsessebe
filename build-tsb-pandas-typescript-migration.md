# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-07T06:45:00Z |
| Iteration Count | 120 |
| Best Metric | 75 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258` |
| PR | #54 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 75 files (iter 120). Next candidates:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/stats/wide_to_long_enhanced.ts` — wide_to_long with stubvar / i / j options
- `src/stats/replace.ts` — `Series.replace()` / `DataFrame.replace()` value substitution

---

## 📚 Lessons Learned

- **Iter 120 (pct_change)**: `pctChange(series, periods)` formula is `(x[i] - x[i-p]) / |x[i-p]|`. Zero prior → ±Infinity (matching pandas). `periods=0` → all-NaN. DataFrame construction requires `Map<string, Series<Scalar>>`, not `Map<string, number[]>` — use the `colWise/rowWise` helper pattern from `shift_diff.ts`. Biome requires `Number.NaN` instead of bare `NaN` global. Import `fc` as default, not namespace (`import fc from "fast-check"`). Import types from `../../src/index.ts`, not `../../src/types.ts` directly. Function complexity > 15 requires extraction into sub-helpers.
- **Iter 119 (unique/nunique)**: All missing sentinels (null, undefined, NaN) should map to the same key in `scalarKey()` for consistent de-duplication. Use `"__MISSING__"` sentinel key. Property tests for DataFrame construction must ensure all columns have the same row count — use `.chain()` to bind `nrows` before generating column arrays. `import type { DataFrame }` required (it's only used as a type parameter in function signatures). Nested ternary for axis normalisation triggers biome nursery rule — use `if/else` chain instead.
- **Iter 118 (between)**: `between(series, left, right, options)` mirrors pandas `Series.between`. Four inclusive modes: `"both"` (default), `"neither"`, `"left"`, `"right"`. Guard with `isMissing()` before comparing — null/undefined/NaN always yield false. Missing bounds (null/NaN/undefined) short-circuit to all-false result. `as number` casts after `isMissing()` guard are provably safe (consistent with `compare.ts` pattern). Need to also merge prior sub-branch commits (iter 117 isin was on a sub-branch) before implementing next iteration.
- **Iter 117 (isin)**: `isIsinDict()` guard distinguishes plain-object `IsinDict` from `Iterable` values by checking `!Array.isArray && !(instanceof Set) && Symbol.iterator not a function`. NaN never matches even if NaN is in the lookup Set (JS Set uses SameValueZero but we guard with `Number.isNaN` before the set lookup). `boolean extends Scalar` so `boolean[]` is directly assignable to `Scalar[]` without casts; keep `data: Scalar[]` for cleanliness.
- **Iter 116 (explode)**: `Scalar` type does not include arrays, so `Array.isArray(v)` where `v: Scalar` narrows to `never`. Fix: widen to `readonly unknown[]` via implicit assignment (`const w: readonly unknown[] = series.values`) — no cast needed since `readonly Scalar[]` ⊆ `readonly unknown[]` (readonly arrays are covariant). `explodeSeries` accepts `Series<Scalar>` and returns `Series<Scalar>`. `explodeDataFrame` handles both single and multi-column explosion; empty arrays → null row. `Map.get()` returns `T | undefined`, use `!== undefined` guard rather than `as T` cast.
- **Iter 115 (align)**: `alignSeries` and `alignDataFrame` are thin wrappers over `reindexSeries`/`reindexDataFrame` — the heavy lifting is already done. Key design: `resolveIndex()` switches on the `join` policy using `Index.union()`, `.intersection()`, or the original index. For `alignDataFrame`, normalise `axis` to `0 | 1 | null` before branching; `null` aligns both axes. Column indices are `Index<string>` — casting from `Index<Label>` via `as Index<string>` is safe since `resolveIndex` returns the same element type.
- **Iter 114 (reindex)**: `Index` constructor takes `(data: readonly T[], name?)` — NOT `{ data }`. The `toIndex()` helper must call `new Index(src)` directly. Property tests need to ensure data/labels lengths match before constructing a Series. Two-pass `leftDist/rightVal` + `rightDist/rightVal` arrays enable O(n) nearest fill. `applyFfill` increments `streak` in both the "fill applied" and "no prior value" branches to correctly enforce `limit`. `applyNearest` prefers right (forward) on equidistant tie — matching pandas.
- **Iter 113 (duplicated/drop_duplicates)**: `df.has(col)` is the correct method. Row key built by JSON-encoding cells with sentinels. `computeDuplicateMask()` centralises all three `keep` policies.
- **Iter 111 (searchsorted)**: `side="left"` stops at first `a[mid] >= v`; `side="right"` at `a[mid] > v`. NaN treated as greater than all numbers. `argsortScalars` produces `sorter` permutation.
- **Iter 110 (natsort)**: Tokenise strings into alternating text/digit chunks. `natArgSort` pre-computes keys then sorts indices.
- **Iter 109 (combine_first)**: `buildLabelMap(idx)` helper for O(1) label lookup. Check `isMissing(selfVal)` before falling back to `other`.
- **Iter 108 (dropna standalone)**: Pre-fetch column arrays into `Map` for efficient row scanning. `_selectRows()` uses `Set<number>` then calls `df.filter()`.
- **Iter 107 (notna/isna)**: `SeriesOptions.name` is `string | null`. Missing helper: `v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))`.
- **Iter 106 (infer_dtype)**: Use `unknown[]` input type so specialised objects pass type-checks.
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

**State (iter 120)**: 75 files. Next: io/read_excel (XLSX zero-dep) · stats/wide_to_long_enhanced · stats/replace (value substitution)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 120 — 2026-04-07 06:45 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24067846118)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/pct_change.ts` — `pctChange(series, periods)` and `dataFramePctChange(df, periods, {axis})` mirroring `pandas.Series.pct_change()` and `pandas.DataFrame.pct_change()`.
- **Metric**: 75 (previous: 74, delta: +1)
- **Commit**: e0a4185
- **Notes**: Formula `(x[i] - x[i-p]) / |x[i-p]|`. Zero prior → ±Infinity. `periods=0` → all-NaN. Axis=0 (column-wise) and axis=1 (row-wise). 36 unit + property-based tests.

### Iteration 119 — 2026-04-07 05:37 UTC — ✅ unique/nunique (74)
### Iteration 118 — 2026-04-07 04:55 UTC — ✅ between (73)

### Iters 116–119 — ✅ (metrics 71→74): explode, isin, between, unique/nunique

### Iters 103–115 — ✅ (metrics 58→70): assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna, combine_first, natsort, searchsorted, valueCountsBinned, duplicated, reindex, align
### Iters 53–102 — ✅ (metrics 8→57): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
