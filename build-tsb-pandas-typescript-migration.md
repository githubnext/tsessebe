# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T09:52:00Z |
| Iteration Count | 15 |
| Best Metric | 16 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-compare-15` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration-indexing-14-e855a3b-1775294315`](../../tree/autoloop/build-tsb-pandas-typescript-migration-indexing-14-e855a3b-1775294315)
**Pull Request**: —
**Steering Issue**: —

---

## 🎯 Current Priorities

Comparison/boolean ops done (metric=16). Next priorities in order:
1. ~~**DateTime accessor** (`src/core/datetime.ts`)~~ — ✅ Done (Iteration 12)
2. ~~**Sorting utilities** (`src/core/sort.ts`)~~ — ✅ Done (Iteration 13)
3. ~~**Indexing/selection** (`src/core/indexing.ts`)~~ — ✅ Done (Iteration 14)
4. ~~**Comparison/boolean ops** (`src/core/compare.ts`)~~ — ✅ Done (Iteration 15)
5. **Reshaping** (`src/reshape/`) — pivot, melt, stack, unstack

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
- Iter 14 (indexing): Biome v2.4.x via npx is incompatible with project's biome.json (1.9.4 schema). Install `@biomejs/biome@1.9.4` in node_modules for correct linting. `resolveILocPositions`/`resolveLocPositions` hit complexity 15 limit — extract `boolMaskToPositions`, `normaliseSinglePos`, `labelToPositions`, `labelArrayToPositions`. `exactOptionalPropertyTypes`: use `?? null` not just undefined for `name` field in SeriesOptions. Use `import fc from "fast-check"` (default import), not `import * as fc`.

- Iter 15 (compare): No circular deps — compare.ts imports Series/DataFrame. Null comparisons: all ops return false for null operands except `ne` which returns true. `logicalNotSeries` passes nulls through unchanged. DataFrame axis="columns" broadcasts Series by col name; axis="index" broadcasts by row label. Use `import type { Index }` for type-only usage.

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
- ~~Sorting utilities~~ ✅ (Iter 13) · ~~Indexing/selection~~ ✅ (Iter 14) · ~~Comparison/boolean ops~~ ✅ (Iter 15) · **Next**: Reshaping (pivot/melt/stack/unstack)
- **Later**: Reshaping (pivot/melt/stack/unstack) · Window functions (rolling/expanding/ewm)

### Phase 3+ — I/O, Stats, Advanced
read_csv/json/parquet · to_csv/json · describe/corr/cov · Categorical · MultiIndex · Timedelta

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 15 — 2026-04-04 09:52 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23976407516)

- **Status**: ✅ Accepted
- **Change**: `src/core/compare.ts` — element-wise eq/ne/lt/gt/le/ge for Series & DataFrame with index alignment, logical and/or/xor/not, anySeries/allSeries/anyDataFrame/allDataFrame. Axis="columns"/"index" for DataFrame-vs-Series broadcast.
- **Metric**: 16 (previous best: 15, delta: +1)
- **Commit**: d49f29e
- **Notes**: 45 unit tests + 4 property-based tests, 100% function & line coverage on compare.ts. Null operands: all comparisons return false except `ne` (returns true). `logicalNotSeries` passes null through unchanged.

### Iteration 14 — 2026-04-04 09:22 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23975921449)

- **Status**: ✅ Accepted
- **Change**: `src/core/indexing.ts` — Slice (start:stop:step), locSeries/ilocSeries (scalar/array/BooleanMask/Slice), locDataFrame/ilocDataFrame (2D row+col selection), atDataFrame/iatDataFrame.
- **Metric**: 15 (previous best: 14, delta: +1)
- **Commit**: de3cab8
- **Notes**: 50+ unit tests + 3 property-based tests. Biome 1.9.4 lint + TypeScript typecheck clean. Helper extraction for complexity compliance; `?? null` for exactOptionalPropertyTypes on Series name field.

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
