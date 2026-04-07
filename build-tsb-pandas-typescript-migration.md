# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-07T00:36:00Z |
| Iteration Count | 114 |
| Best Metric | 69 |
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

Now at 69 files (iter 114). Next candidates:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/stats/wide_to_long_enhanced.ts` — wide_to_long with stubvar / i / j options
- `src/core/align.ts` — align two Series/DataFrames to a common index (inner/outer/left/right join)

---

## 📚 Lessons Learned

- **Iter 114 (reindex)**: `Index` constructor takes `(data: readonly T[], name?)` — NOT `{ data }`. The `toIndex()` helper must call `new Index(src)` directly. Property tests need to ensure data/labels lengths match before constructing a Series. Two-pass `leftDist/rightVal` + `rightDist/rightVal` arrays enable O(n) nearest fill. `applyFfill` increments `streak` in both the "fill applied" and "no prior value" branches to correctly enforce `limit`. `applyNearest` prefers right (forward) on equidistant tie — matching pandas.
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

**State (iter 114)**: 69 files. Next: io/read_excel (XLSX zero-dep) · core/align (align two Series/DataFrames) · stats/wide_to_long_enhanced

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 114 — 2026-04-07 00:36 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24058069960)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/reindex.ts` — `reindexSeries` and `reindexDataFrame` mirroring `pandas.Series.reindex` / `pandas.DataFrame.reindex`.
- **Metric**: 69 (previous: 68, delta: +1)
- **Commit**: 56d501f
- **Notes**: `reindexSeries` supports `fillValue`, `method` (ffill/bfill/nearest), and `limit`. `reindexDataFrame` accepts `index` and/or `columns` options. Two-pass O(n) algorithm for nearest fill. `Index` constructor takes positional array (not `{data}` options). 42 tests (unit + 4 property-based).

### Iteration 113 — 2026-04-06 23:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24056802429)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/duplicated.ts` — `duplicatedDataFrame`, `dropDuplicatesDataFrame`, `duplicatedSeries`, `dropDuplicatesSeries` mirroring `pandas.DataFrame.duplicated` / `pandas.DataFrame.drop_duplicates`.
- **Metric**: 68 (previous: 67, delta: +1)
- **Commit**: 0d31f77
- **Notes**: Row keys JSON-encoded with `\x00` sentinels for null/NaN. `computeDuplicateMask()` centralises `keep="first"|"last"|false` logic. `df.has()` (not `hasColumn`). 54 tests (unit + property).

### Iteration 112 — 2026-04-06 23:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24055806100)
- **Status**: ✅ Accepted | **Metric**: 67 (+1) | `valueCountsBinned` — value_counts with bins=N

### Iteration 111 — 2026-04-06 22:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24054920717)
- **Status**: ✅ Accepted | **Metric**: 66 (+1) | `searchsorted` — binary search (left/right sides, sorter)

### Iteration 110 — 2026-04-06 22:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24053743467)
- **Status**: ✅ Accepted | **Metric**: 65 (+1) | `natsort` — natural-order string sorting

### Iteration 109 — 2026-04-06 21:46 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24052777878)
- **Status**: ✅ Accepted | **Metric**: 64 (+1) | `combine_first` — fill missing from other Series/DataFrame

### Iters 103–108 — ✅ (metrics 58→63): assign, clip_with_bounds, pivotTableFull, infer_dtype, notna/isna, dropna
### Iters 53–102 — ✅ (metrics 8→57): named_agg, select_dtypes, memory_usage, Timestamp, to_numeric, json_normalize, wide_to_long, crosstab, get_dummies, factorize, datetime_tz, numeric_ops, DateOffset, date_range, where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, Foundation+GroupBy+merge+str+dt+describe+csv/json+corr+rolling+expanding+ewm+stack/unstack+melt/pivot+value_counts+MultiIndex
### Iterations 1–52 — ✅ Earlier work on diverged branches
