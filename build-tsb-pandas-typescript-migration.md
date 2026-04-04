# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T07:48:00Z |
| Iteration Count | 11 |
| Best Metric | 12 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: (see PR created this run — #aw_pr10)
**Steering Issue**: —

---

## 🎯 Current Priorities

Missing data done (metric=12). Next priorities in order:
1. **DateTime accessor** (`src/core/datetime.ts`) — Series.dt accessor: year/month/day/hour/minute/dayofweek etc.
2. **Sorting** (`src/core/sort.ts`) — sort_values, sort_index standalone functions
3. **Indexing/selection** (`src/core/indexing.ts`) — standalone .loc, .iloc, .at, .iat helpers

---

## 📚 Lessons Learned

- Iteration 1: Project structure established cleanly with Bun + Biome + strict TypeScript. The `types.ts` shared type file is the right home for `Scalar`, `Label`, `Axis`, `DtypeName`, etc.
- Iteration 3: Series<T> is best implemented as a thin wrapper around a readonly array + Index<Label> + Dtype. The `exactOptionalPropertyTypes: true` setting means you can't pass `{ name: undefined }` where `name?: string | null` is expected — use conditional spreads. For test type safety with literal-inferred Index<1|2|3>, add explicit `<number>` type parameter to avoid literal type unions that break cross-index operations. The `noUncheckedIndexedAccess` flag requires explicit `as T | undefined` casts on array accesses in sorted iterators.
- Iteration 2: Index<T> was already implemented by Copilot agent on `copilot/autoloop-build-tsb-pandas-migration`. Built on top of that work. Dtype system implemented as immutable singletons (cached with Map). `noUncheckedIndexedAccess: true` requires `as T | undefined` guards for array element access. Index<T> method signatures should accept `Label` (not T) for query/set ops to avoid TypeScript literal type inference issues.
- The `autoloop/build-tsb-pandas-typescript-migration` branch should be created from main (which has merged PRs), not from the stale autoloop branch that tracked old commit SHAs.
- Iteration 8 (aligned arithmetic): `ops.ts` provides `alignSeries`, `alignedBinaryOp`, `alignDataFrames`, `alignedDataFrameBinaryOp` as standalone utilities. No circular deps: `ops.ts` imports Series/DataFrame but they don't import back. For `_scalarOp` in `series.ts`, inline the `buildIndexMap` helper instead of importing from `ops.ts`. `Index.has()` doesn't exist — use `Index.contains()` instead. `biome check --write` auto-fixes import ordering and formatting. Use `default:` case in switch instead of last `case "right":` to satisfy `useDefaultSwitchClause`. TypeScript with `noUncheckedIndexedAccess` requires explicit guards: `map.get(key) as T | undefined`. `as unknown as number | null` cast is needed when converting Scalar values to numbers in arithmetic helpers.
- Iteration 5 (DataFrame): Column-oriented storage using `ReadonlyMap<string, Series<Scalar>>` is the right model. Biome's `useLiteralKeys` vs TypeScript's `noPropertyAccessFromIndexSignature` for `Record<string, T>` types — resolve by testing with `toEqual({...})` patterns instead of property access. Extract helper functions to satisfy `noExcessiveCognitiveComplexity` (max 15). `compareScalarPair` and `computeColumnStats` are good examples of extracted helpers. Use `biome check --write` to auto-fix formatting issues. PR creation has failed in previous iterations due to protected-file restrictions — the current branch setup from `main` should work better.
- Iteration 10 (merge): `merge()` in `src/merge/merge.ts` — build right-side key index as `Map<compositeKey, number[]>` then scan left rows. The sentinel value `-1` on leftRows signals a right-only row (for right/outer joins). Composite keys use `\x00` delimiter + `__NULL__` for nulls to avoid false collisions. `left_on`/`right_on` pairs allow different key names per side; `left_index`/`right_index` wraps the index values in a synthetic Series. Suffix disambiguation applies only to non-key columns that appear in both tables.

- Iteration 9 (Series.str): `StringAccessor` in `strings.ts`. Circular ESM dep works fine. Move regex to top level (`useTopLevelRegex`). Extract helpers to avoid `noExcessiveCognitiveComplexity`. Fix: `_selectRows` column Series use fresh RangeIndex. Fix: GroupBy aggregation numeric-only.
- Iteration 11 (missing data): Test files MUST import from `src/index.ts` (`useImportRestrictions` nursery rule). `df.columns` → `Index<string>`, iterate via `.values`. Use `df.get(name)` (returns `undefined`) not `df.col(name)` (throws). `Index.getLoc(key)` returns `number | readonly number[]`. Extract helpers for complexity (max 15). `!(a && b)` preferred over `!a || !b`.

---

## 🚧 Foreclosed Avenues

- *(none yet)*

---

## 🔭 Future Directions

### Phase 1 — Core Foundation (next 5 iterations)
1. ~~**Index** (`src/core/index.ts`)~~ — ✅ Done (by Copilot agent, merged into main)
2. ~~**Dtype system** (`src/core/dtype.ts`)~~ — ✅ Done (Iteration 2/3)
3. ~~**Series** (`src/core/series.ts`)~~ — ✅ Done (Iteration 3)
4. ~~**DataFrame** (`src/core/frame.ts`)~~ — ✅ Done (Iteration 5)
5. **Indexing/selection** (`src/core/indexing.ts`) — standalone .loc, .iloc, .at, .iat helpers; MultiIndex groundwork

### Phase 2 — Operations (iterations 6-15)
6. ~~**Arithmetic operations** (Series + Series, DataFrame + DataFrame, broadcasting)~~ ✅ Done (Iteration 8)
7. Comparison and boolean operations
8. ~~**String accessor** (Series.str)~~ ✅ Done (Iteration 9)
9. DateTime accessor (Series.dt)
10. ~~**Missing data handling**~~ ✅ Done (Iteration 11) — isna/notna, ffill/bfill, fillna, dropna, interpolate
11. Sorting (sort_values, sort_index)
12. ~~**Groupby**~~ ✅ Done (Iteration 6)
13. **Merging/joining** (merge, join, **concat**) — ~~concat~~ ✅ Done (Iteration 7), ~~merge~~ ✅ Done (Iteration 10)
14. Reshaping (pivot, melt, stack, unstack, crosstab)
15. Window functions (rolling, expanding, ewm)

### Phase 3+ — I/O, Stats, Advanced
16-20. read_csv/json/parquet, to_csv/json, from_dict/records
21-25. describe/corr/cov, Categorical, MultiIndex, Timedelta, Sparse

---

## 📊 Iteration History

### Iteration 11 — 2026-04-04 07:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23974522158)

- **Status**: ✅ Accepted
- **Change**: Implemented `src/core/missing.ts` — full missing-data utility suite: `isna`/`notna`/`isnull`/`notnull`, `ffill`/`bfill` (with limit), `fillnaSeries`/`fillnaDataFrame` (value or method), `dropnaSeries`, `dropnaDataFrame` (axis/how/thresh/subset), `interpolate`/`interpolateDataFrame`.
- **Metric**: 12 (previous best: 11, delta: +1)
- **Commit**: 4c2a1ea
- **Notes**: 50+ unit tests + 4 property-based tests. All lint/typecheck clean.

### Iteration 10 — [Run](https://github.com/githubnext/tsessebe/actions/runs/23974130597)
- **Status**: ✅ Accepted | **Metric**: 11 (+1) | **Commit**: 40058db
- **Change**: `merge()` — database-style joins inner/left/right/outer, on/left_on/right_on, many-to-many.

### Iteration 9 — [Run](https://github.com/githubnext/tsessebe/actions/runs/23973555676)
- **Status**: ✅ Accepted | **Metric**: 10 (+1) | **Commit**: 6bd3f36
- **Change**: StringAccessor `strings.ts` — 20+ vectorized string methods on Series.str.

### Iteration 8 — [Run](https://github.com/githubnext/tsessebe/actions/runs/23973131426)
- **Status**: ✅ Accepted | **Metric**: 9 (+1) | **Commit**: 6fb9189
- **Change**: Aligned arithmetic `ops.ts` — alignSeries/alignedBinaryOp/alignDataFrames. DataFrame.add/sub/mul/div.

### Iteration 7 — 2026-04-04 05:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23972580333)

- **Status**: ✅ Accepted | **Metric**: 8 (+1) | **Commit**: ee507e5
- **Change**: `concat()` — axis=0/1, outer/inner join, ignoreIndex.

### Iteration 6 — 2026-04-04 05:13 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23972003902)

- **Status**: ✅ Accepted | **Metric**: 7 (+1) | **Commit**: 57d00f3
- **Change**: `GroupBy` — DataFrameGroupBy and SeriesGroupBy: sum/mean/min/max/count/std/first/last/size, agg, transform, apply, filter.

### Iterations 1–5 (summary)
- **Iteration 5** ✅: DataFrame (metric=6, commit afe1066)
- **Iteration 4** ⚠️: Error (PR creation failed)
- **Iteration 3** ✅: Dtype + Series (metric=5, commit 36e76a5)
- **Iteration 2** ✅: Dtype + Index fixes (metric=4, commit a45d5c1)
- **Iteration 1** ✅: Project foundation (metric=1, baseline)
