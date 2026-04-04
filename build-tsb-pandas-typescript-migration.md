# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T08:47:00Z |
| Iteration Count | 13 |
| Best Metric | 14 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-sort-13` |
| PR | #aw_pr13 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration-sort-13`](../../tree/autoloop/build-tsb-pandas-typescript-migration-sort-13)
**Pull Request**: #aw_pr13
**Steering Issue**: —

---

## 🎯 Current Priorities

Missing data done (metric=12). DateTime accessor done (metric=13). Sorting utilities done (metric=14). Next priorities in order:
1. ~~**DateTime accessor** (`src/core/datetime.ts`)~~ — ✅ Done (Iteration 12)
2. ~~**Sorting utilities** (`src/core/sort.ts`)~~ — ✅ Done (Iteration 13)
3. **Indexing/selection** (`src/core/indexing.ts`) — standalone .loc, .iloc, .at, .iat helpers
4. **Comparison/boolean ops** (`src/core/compare.ts`) — eq/ne/lt/gt/le/ge returning boolean Series/DataFrame

---

## 📚 Lessons Learned

- Iter 3: Series<T> thin wrapper: readonly array + Index<Label> + Dtype. `exactOptionalPropertyTypes`: use conditional spreads. `noUncheckedIndexedAccess`: explicit `as T | undefined` on array accesses.
- Iter 2: Index<T> method signatures accept `Label` (not T) for query/set ops. Dtype singletons cached with Map.
- The autoloop branch should be created from main (merged PRs), not stale old branches.
- Iter 8 (ops): No circular deps — `ops.ts` imports Series/DataFrame, they don't import back. `Index.contains()` not `has()`. `biome check --write` auto-fixes imports. Use `default:` in switch for `useDefaultSwitchClause`.
- Iter 5 (DataFrame): Column-oriented with `ReadonlyMap<string, Series<Scalar>>`. Extract helpers for `noExcessiveCognitiveComplexity` (max 15).
- Iter 10 (merge): Composite keys use `\x00` + `__NULL__` for nulls. Sentinel `-1` on leftRows = right-only row.
- Iter 9 (strings): `StringAccessor` circular ESM dep fine. Move regex to top level (`useTopLevelRegex`).
- Iter 11 (missing): Test files import from `src/index.ts` (`useImportRestrictions`). `df.get(name)` (→ undefined) not `df.col(name)` (throws).
- Iter 12 (datetime): Extract helpers outside class for complexity. `(getDay() + 6) % 7` for Mon=0 dayofweek. Property tests with `fc.date()`.
- Iter 13 (sort): Use `import type { Index }` when only used as type annotation. Aggressive helper extraction needed for rank's 5-method algorithm. `biome check --write` auto-formats long signatures.

---

## 🚧 Foreclosed Avenues

- *(none yet)*

---

## 🔭 Future Directions

### Phase 1 — Core Foundation ✅ Done
Index, Dtype, Series, DataFrame all implemented.

### Phase 2 — Operations (active)
- ~~Arithmetic~~ ✅ (Iter 8) · ~~String accessor~~ ✅ (Iter 9) · ~~DateTime accessor~~ ✅ (Iter 12)
- ~~Missing data~~ ✅ (Iter 11) · ~~Groupby~~ ✅ (Iter 6) · ~~concat~~ ✅ (Iter 7) · ~~merge~~ ✅ (Iter 10)
- ~~Sorting utilities~~ ✅ (Iter 13) · **Next**: Comparison/boolean ops · Indexing (.loc/.iloc)
- **Later**: Reshaping (pivot/melt/stack/unstack) · Window functions (rolling/expanding/ewm)

### Phase 3+ — I/O, Stats, Advanced
read_csv/json/parquet · to_csv/json · describe/corr/cov · Categorical · MultiIndex · Timedelta

---

## 📊 Iteration History

### Iteration 13 — 2026-04-04 08:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23975470093)

- **Status**: ✅ Accepted
- **Change**: `src/core/sort.ts` — sorting utilities: `nlargest`/`nsmallest` for Series and DataFrame (keep='first'/'last'/'all'), `rank()` with 5 methods (average/min/max/first/dense), `naOption`, `pct`, `rankDataFrame`.
- **Metric**: 14 (previous best: 13, delta: +1)
- **Commit**: 688f640
- **Notes**: 40+ unit tests + 5 property-based tests. Biome lint + TypeScript typecheck clean. `computeRanks` split into `assignInitialRanks`, `applyDensePass`, `normaliseToPct` to satisfy `noExcessiveCognitiveComplexity` (max 15).

### Iteration 12 — 2026-04-04 08:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23974951477)
- **Status**: ✅ Accepted | **Metric**: 13 (+1) | **Commit**: 6ce8c17
- **Change**: `src/core/datetime.ts` — Series.dt: calendar components, ISO week, dayofweek (Mon=0), strftime (17 directives). 78 unit + 6 property tests.

### Iteration 11 — 2026-04-04 07:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23974522158)
- **Status**: ✅ Accepted | **Metric**: 12 (+1) | **Commit**: 4c2a1ea
- **Change**: `src/core/missing.ts` — isna/notna/ffill/bfill/fillna/dropna/interpolate for Series & DataFrame. 50+ unit + 4 property tests.

### Iteration 10 — [Run](https://github.com/githubnext/tsessebe/actions/runs/23974130597)
- **Status**: ✅ Accepted | **Metric**: 11 (+1) | **Commit**: 40058db
- **Change**: `merge()` — inner/left/right/outer joins, on/left_on/right_on, many-to-many.

### Iteration 9 — [Run](https://github.com/githubnext/tsessebe/actions/runs/23973555676)
- **Status**: ✅ Accepted | **Metric**: 10 (+1) | **Commit**: 6bd3f36
- **Change**: `strings.ts` StringAccessor — 20+ vectorized string methods on Series.str.

### Iterations 1–8 (summary)
- Iter 8 ✅ ops.ts aligned arithmetic (9) · Iter 7 ✅ concat (8) · Iter 6 ✅ GroupBy (7)
- Iter 5 ✅ DataFrame (6) · Iter 4 ⚠️ Error · Iter 3 ✅ Dtype+Series (5) · Iter 2 ✅ Index+Dtype (4) · Iter 1 ✅ Foundation (1)
