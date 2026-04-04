# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T05:20:00Z |
| Iteration Count | 6 |
| Best Metric | 7 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-next` |
| PR | (see PR created this run) |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: (see PR created this run)
**Steering Issue**: —

---

## 🎯 Current Priorities

GroupBy is done (metric=7). Next priorities in order:
1. **concat** (`src/merge/concat.ts`) — combine DataFrames/Series along an axis; prerequisite for many real-world workflows
2. **Arithmetic operations** (`src/core/ops.ts`) — Series+Series, DataFrame+DataFrame with broadcasting, alignment by index
3. **Missing data** (`src/core/missing.ts`) — isna/notna/fillna/dropna with all fill strategies

---

## 📚 Lessons Learned

- Iteration 1: Project structure established cleanly with Bun + Biome + strict TypeScript. The `types.ts` shared type file is the right home for `Scalar`, `Label`, `Axis`, `DtypeName`, etc.
- Iteration 3: Series<T> is best implemented as a thin wrapper around a readonly array + Index<Label> + Dtype. The `exactOptionalPropertyTypes: true` setting means you can't pass `{ name: undefined }` where `name?: string | null` is expected — use conditional spreads. For test type safety with literal-inferred Index<1|2|3>, add explicit `<number>` type parameter to avoid literal type unions that break cross-index operations. The `noUncheckedIndexedAccess` flag requires explicit `as T | undefined` casts on array accesses in sorted iterators.
- Iteration 2: Index<T> was already implemented by Copilot agent on `copilot/autoloop-build-tsb-pandas-migration`. Built on top of that work. Dtype system implemented as immutable singletons (cached with Map). `noUncheckedIndexedAccess: true` requires `as T | undefined` guards for array element access. Index<T> method signatures should accept `Label` (not T) for query/set ops to avoid TypeScript literal type inference issues.
- The `autoloop/build-tsb-pandas-typescript-migration` branch should be created from main (which has merged PRs), not from the stale autoloop branch that tracked old commit SHAs.
- Iteration 5 (DataFrame): Column-oriented storage using `ReadonlyMap<string, Series<Scalar>>` is the right model. Biome's `useLiteralKeys` vs TypeScript's `noPropertyAccessFromIndexSignature` for `Record<string, T>` types — resolve by testing with `toEqual({...})` patterns instead of property access. Extract helper functions to satisfy `noExcessiveCognitiveComplexity` (max 15). `compareScalarPair` and `computeColumnStats` are good examples of extracted helpers. Use `biome check --write` to auto-fix formatting issues. PR creation has failed in previous iterations due to protected-file restrictions — the current branch setup from `main` should work better.
- Iteration 4 (previous): DataFrame was implemented but PR creation failed silently. The state file was updated in repo-memory but no code reached the repository. Always verify commits actually reach the repo.
- Iteration 6 (GroupBy): Keep group key types as `Label` (not `Scalar`) to avoid complications with Map equality and Index construction. Use `toLabel()` helper to coerce bigint/Date scalars. Multi-column groupby: composite tab-separated string keys (no MultiIndex yet). Tests should import from the barrel (`src/index.ts`) rather than individual files, per Biome's `useImportRestrictions` rule. The `arrGet()` helper cleanly handles `noUncheckedIndexedAccess` for array access in groupby loops. Circular import avoidance: keep GroupBy as standalone functions (`seriesGroupBy()`, `dataFrameGroupBy()`) rather than instance methods on Series/DataFrame.

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
6. ~~**Groupby** (groupby, agg, transform, apply)~~ — ✅ Done (Iteration 6)
7. **Merging/joining** (concat, merge, join) ← high priority
8. Arithmetic operations (Series + Series, DataFrame + DataFrame, broadcasting)
14. Reshaping (pivot, melt, stack, unstack, crosstab)
15. Window functions (rolling, expanding, ewm)

### Phase 3 — I/O (iterations 16-20)
16-20. read_csv, read_json, read_parquet (WASM), read_excel, from_dict/from_records

### Phase 4 — Statistics & Advanced
21-25. describe/corr/cov, Categorical dtype, MultiIndex, Timedelta/Period, Sparse arrays

---

## 📊 Iteration History

### Iteration 6 — 2026-04-04 05:20 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23971938070)

- **Status**: ✅ Accepted
- **Change**: Implemented `SeriesGroupBy` and `DataFrameGroupBy` — split-apply-combine engine with sum/mean/min/max/count/first/last/std, agg(func|name|spec), transform, apply, getGroup, Symbol.iterator. 35+ tests + 4 fast-check property tests.
- **Metric**: 7 (previous best: 6, delta: +1)
- **Commit**: 8aa0900
- **Notes**: Group keys are `Label` (not `Scalar`) to allow clean Index construction. `toLabel()` helper coerces bigint/Date. Multi-column keys are tab-separated composite strings. Circular import avoidance: standalone functions rather than instance methods. Biome/TSC clean except for missing bun-types in CI-less environment.

### Iteration 5 — 2026-04-04 04:58 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23971604724)

- **Status**: ✅ Accepted
- **Change**: Implemented `DataFrame` — 2-D column-oriented labeled table with fromColumns/fromRecords/from2D constructors, shape/ndim/size/empty, col/get/has, head/tail/iloc/loc, assign/drop/select/rename, isna/notna/dropna/fillna, filter, sum/mean/min/max/std/count/describe, sortValues/sortIndex, apply(axis=0/1), items/iterrows, toRecords/toDict/toArray, resetIndex/setIndex, toString. 35+ tests. Playground page.
- **Metric**: 6 (previous best: 5, delta: +1)
- **Commit**: afe1066
- **Notes**: Previous iteration 4 (run 23970468437) implemented DataFrame but PR creation failed. This run re-implements and successfully commits the work. Branch was reset from main to pick up all prior merged work. Key lessons: extract helpers for complexity, use toEqual patterns to avoid useLiteralKeys vs noPropertyAccessFromIndexSignature conflict, `biome check --write` auto-fixes most formatting issues.

### Iteration 4 — 2026-04-04 03:55 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23970468437)

- **Status**: ⚠️ Error (PR creation failed — code never committed to repo)
- **Change**: Attempted DataFrame implementation — same scope as iteration 5.
- **Metric**: N/A (PR creation failed: "Failed to apply patch")
- **Notes**: The state file was updated in repo-memory claiming metric=6, but no code reached the repository. The branch tracking was also wrong (pointing to old stale autoloop branch).

### Iteration 3 — 2026-04-04 01:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23968306924)

- **Status**: ✅ Accepted
- **Change**: Implemented Dtype system (16 immutable pandas-equivalent dtype singletons with `DtypeKind`, `itemsize`, type predicates, `canCastTo`, `commonType`, `inferFrom`) and full `Series<T>` (1-D labeled array with element access, arithmetic, comparison, boolean masking, statistical aggregation, sorting, missing-value handling, `map`, `isin`, `valueCounts`, conversion).
- **Metric**: 5 (previous best: 4, delta: +1)
- **Commit**: 36e76a5
- **Notes**: Series and Dtype both land in one iteration. The `exactOptionalPropertyTypes` tsconfig requires conditional spreads when passing optional `name`. Biome's `useImportRestrictions` rule requires tests to import from the barrel (`src/core/index.ts`) rather than individual files — added Dtype+Series to core barrel. Literal type inference issues in tests fixed by adding explicit `<number>` type params.

### Iteration 2 — 2026-04-03 19:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23958625367)

- **Status**: ✅ Accepted
- **Change**: Dtype system — 16 pandas dtypes as immutable singletons, type predicates, safe casting, commonType(), inferFrom(). Fixed noUncheckedIndexedAccess errors in base-index.ts.
- **Metric**: 4 (delta: +3, Index/RangeIndex already in copilot branch)
- **Commit**: a45d5c1

### Iteration 1 — 2026-04-03 16:54 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23954278176)

- **Status**: ✅ Accepted
- **Change**: Project foundation — package.json, tsconfig.json (strict), biome.json, bunfig.toml, src/index.ts, src/types.ts, CI, Pages, playground, AGENTS.md, CLAUDE.md
- **Metric**: 1 (baseline)
- **Commit**: see PR
