# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T23:46:00Z |
| Iteration Count | 113 |
| Best Metric | 68 |
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

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 68 files (iter 113). Next candidates:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/stats/wide_to_long_enhanced.ts` — wide_to_long with stubvar / i / j options
- `src/core/reindex.ts` — reindex Series/DataFrame to new index with fill method

---

## 📚 Lessons Learned

- **Iter 113 (duplicated/drop_duplicates)**: `df.has(col)` is the correct method (not `df.hasColumn()`). Row key built by JSON-encoding each cell value with `\x00`-prefixed sentinels for null/NaN to avoid collisions. `computeDuplicateMask()` centralises all three `keep` policies. Test files need `import type { Scalar }` when mixing number/string in a `Map<string, Series<Scalar>>`.
- **Iter 111 (searchsorted)**: Binary search using bisect algorithm. `side="left"` stops at first `a[mid] >= v`; `side="right"` stops at first `a[mid] > v`. NaN treated as greater than all numbers (consistent ordering). `argsortScalars` produces the `sorter` permutation. Internal `bisect()` helper accepts a `get(i)` accessor, making `sorter` support zero-cost (just re-route the accessor). 44 unit tests + 4 property-based tests (insertion preserves sort, left≤right, result in [0,n], sorter≡presorted).
- **Iter 110 (natsort)**: Tokenise strings into alternating text/digit chunks with regex `/(\d+)/g`. Digit tokens compare numerically; text tokens compare lexicographically (optionally case-folded). `natArgSort` pre-computes keys then sorts indices — avoids re-tokenising on every comparison. Property tests (anti-symmetry, permutation correctness, argSort≡sorted) catch corner cases effectively.
- **Iter 109 (combine_first)**: `buildLabelMap(idx)` helper creates `Map<string, number[]>` for O(1) label lookup. `Index.union()` handles the index union cleanly. The key insight: check `isMissing(selfVal)` before falling back to `other`. DataFrame path iterates union rows × union cols — straightforward nested loop with per-column Series construction.
- **Iter 108 (dropna standalone)**: `dropna(series)` dispatches to `s.dropna()`. DataFrame path: `axis=0` pre-fetches column arrays into a `Map` for efficient row scanning. `how='all'` checks `nullCount < checkCols.length`. `thresh` checks `nonNullCount >= thresh`. `subset` filters columns before scanning. `axis=1` scans each column's values. `_selectRows()` builds a boolean mask via `Set<number>` then calls `df.filter()`. `_selectCols()` delegates to `df.select()`. Zero `as` casts needed. 44 tests (unit + property-based).
- **Iter 107 (notna/isna)**: `SeriesOptions.name` is `string | null` (not `string | undefined`) — pass `s.name` directly. The `missing()` helper `v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))` is the canonical missing test. `isnull`/`notnull` are simple `const` aliases. DataFrame overload builds a `Map<string, Series<Scalar>>` with `df.index`.
- **Iter 106 (infer_dtype)**: `inferDtype(values, {skipna})` uses `unknown[]` input type so specialised objects like `Timestamp`, `Timedelta`, `Period`, `Interval` pass type-checks. `skipna=true` skips nulls; when all non-null kinds form a Set of size 1 the output is deterministic.
- **Iter 105 (pivotTableFull)**: Grand-total margins computed from raw data values (not re-aggregated cells). `marginValue()` helper concatenates all buckets for a fixed key across opposite keys.
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

**State (iter 112)**: 67 files. Next: io/read_excel (XLSX zero-dep) · core/where_searchsorted alignment helpers

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 113 — 2026-04-06 23:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24056802429)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/duplicated.ts` — `duplicatedDataFrame`, `dropDuplicatesDataFrame`, `duplicatedSeries`, `dropDuplicatesSeries` mirroring `pandas.DataFrame.duplicated` / `pandas.DataFrame.drop_duplicates`.
- **Metric**: 68 (previous: 67, delta: +1)
- **Commit**: 0d31f77
- **Notes**: Row keys JSON-encoded with `\x00` sentinels for null/NaN. `computeDuplicateMask()` centralises `keep="first"|"last"|false` logic. `df.has()` (not `hasColumn`). 54 tests (unit + property).

### Iteration 112 — 2026-04-06 23:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24055806100)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/value_counts_full.ts` — `valueCountsBinned(series, N)` mirroring `pandas.Series.value_counts(bins=N)`.
- **Metric**: 67 (previous: 66, delta: +1)
- **Commit**: 25e8549
- **Notes**: Uses `cut()+cutIntervalIndex()` internally. Supports sort/ascending/normalize. NaN/null excluded. 22 unit tests + 4 property-based tests.

### Iteration 111 — 2026-04-06 22:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24054920717)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/searchsorted.ts` — `searchsorted`, `searchsortedMany`, `argsortScalars` mirroring `numpy.searchsorted` / `pandas.Index.searchsorted`.
- **Metric**: 66 (previous: 65, delta: +1)
- **Commit**: 2ad0e89
- **Notes**: Bisect algorithm with `side="left"|"right"`. `sorter` support via `get(i)` accessor abstraction. Default comparator handles null/NaN/mixed types. 44 unit tests + 4 property tests.

### Iteration 110 — 2026-04-06 22:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24053743467)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/natsort.ts` — `natCompare`, `natSorted`, `natSortKey`, `natArgSort` mirroring `natsort.natsorted()` / `pandas.Index.sort_values(key=natsort_keygen())`.
- **Metric**: 65 (previous: 64, delta: +1)
- **Commit**: 1e9ef3b
- **Notes**: Tokeniser splits on `/(\d+)/g`; digit tokens compare numerically. `natArgSort` pre-computes keys. 5 property-based tests (anti-symmetry, permutation, argSort≡sorted, reverse negation). Tests/playground included.

### Iteration 109 — 2026-04-06 21:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24052777878)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/combine_first.ts` — `combineFirstSeries` and `combineFirstDataFrame` mirroring `pandas.Series.combine_first` / `pandas.DataFrame.combine_first`.
- **Metric**: 64 (previous: 63, delta: +1)
- **Commit**: 9d3fb42
- **Notes**: `buildLabelMap` helper builds label→positions for O(1) lookup. Union index via `Index.union()`. Self values take priority; null/NaN/undefined treated as missing. 30+ unit tests + 3 property-based tests.

### Iters 103–112 — ✅ (metrics 58→67): assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna, combine_first, natsort, searchsorted, valueCountsBinned
### Iters 53–102 — ✅ (metrics 8→57): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
