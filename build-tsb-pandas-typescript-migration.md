# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-04T13:25:00Z |
| Iteration Count | 22 |
| Best Metric | 33 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-timedelta-22` |
| PR | — |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration-multiindex-21`](../../tree/autoloop/build-tsb-pandas-typescript-migration-multiindex-21)
**Pull Request**: —
**Steering Issue**: —

---

## 🎯 Current Priorities

MultiIndex done (metric=33). Next priorities:
1. ~~**DateTime accessor** (`src/core/datetime.ts`)~~ — ✅ Done (Iteration 12)
2. ~~**Sorting utilities** (`src/core/sort.ts`)~~ — ✅ Done (Iteration 13)
3. ~~**Indexing/selection** (`src/core/indexing.ts`)~~ — ✅ Done (Iteration 14)
4. ~~**Comparison/boolean ops** (`src/core/compare.ts`)~~ — ✅ Done (Iteration 15)
5. ~~**Reshaping** (`src/reshape/`)~~ — ✅ Done (Iteration 16)
6. ~~**Window functions** (`src/window/`)~~ — ✅ Done (Iteration 17)
7. ~~**I/O utilities** (`src/io/`)~~ — ✅ Done (Iteration 18)
8. ~~**Statistical functions** (`src/stats/`)~~ — ✅ Done (Iteration 19)
9. ~~**Categorical data** (`src/core/categorical.ts`)~~ — ✅ Done (Iteration 20)
10. ~~**MultiIndex** (`src/core/multi-index.ts`)~~ — ✅ Done (Iteration 21)
11. ~~**Timedelta** (`src/core/timedelta.ts`)~~ — ✅ Done (Iteration 22)
12. **IntervalIndex** (`src/core/interval-index.ts`) — interval/range type with closed parameter

---

## 📚 Lessons Learned

- **General**: `exactOptionalPropertyTypes`: use `?? null` not undefined. `noUncheckedIndexedAccess`: guard array accesses. Complexity ≤15: extract helpers. `useBlockStatements`: braces everywhere. `useTopLevelRegex`: move regex to top level. `useNumberNamespace`: `Number.NaN`. `import fc from "fast-check"` (default import). `biome check --write --unsafe` auto-fixes Array<T>→T[].
- **Imports**: `useImportRestrictions` — import from barrel `../core/index.ts` not direct files. `import type` for type-only imports. Circular ESM deps (strings/datetime/categorical) are fine.
- **Build env**: `bun` not available — use `node_modules/.bin/biome` and `node_modules/.bin/tsc`. Pre-existing TS errors in window/io/tests — only validate new file has 0 errors.
- **Timedelta** (Iter 22): Store as ms integer. `floorDiv`/`floorMod` helpers for Python-style floor-division decomposition (components always non-negative). `Timedelta` NOT in `Scalar` type — `TimedeltaAccessor` accepts numbers (ms) or strings. Accessor's `_mapTd` returns ms numbers to stay within Scalar. Two top-level regex (PANDAS_RE + UNIT_RE) for biome compliance.
- **MultiIndex** (Iter 21): levels+codes compressed storage. Complexity extractors: `buildTargetCodes`/`filterByTargetCodes`/`compareAtLevel`/`makeSortComparator`. Avoid `toFrame()` (potential circular dep); use `toRecord()` instead.
- **Stats** (Iter 19): skew/kurtosis use sample std (ddof=1). G1 = n/((n-1)(n-2))·Σ((xi-x̄)/s)³.
- **Merge** (Iter 10): composite keys use `\x00`+`__NULL__` for nulls; sentinel `-1` = right-only row.

---

## 🔭 Future Directions

### Phase 1 — Core Foundation ✅ Done
Index, Dtype, Series, DataFrame all implemented.

### Phase 2 — Operations ✅ Done
- ~~Arithmetic~~ ✅ (Iter 8) · ~~String accessor~~ ✅ (Iter 9) · ~~DateTime accessor~~ ✅ (Iter 12)
- ~~Missing data~~ ✅ (Iter 11) · ~~Groupby~~ ✅ (Iter 6) · ~~concat~~ ✅ (Iter 7) · ~~merge~~ ✅ (Iter 10)
- ~~Sorting utilities~~ ✅ (Iter 13) · ~~Indexing/selection~~ ✅ (Iter 14) · ~~Comparison/boolean ops~~ ✅ (Iter 15) · ~~Reshaping~~ ✅ (Iter 16) · ~~Window functions~~ ✅ (Iter 17)
- ~~**I/O utilities**~~ ✅ (Iter 18) · ~~**Statistical functions**~~ ✅ (Iter 19) · ~~**Categorical data**~~ ✅ (Iter 20)
- ~~**MultiIndex**~~ ✅ (Iter 21)

### Phase 3+ — Advanced
**Next**: IntervalIndex (`src/core/interval-index.ts`) — interval type with closed parameter (left/right/both/neither), `pd.interval_range()`, overlaps, contains. · Then: `read_parquet`, plotting

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 22 — 2026-04-04 13:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23979784867)

- **Status**: ✅ Accepted
- **Change**: `src/core/timedelta.ts` — `Timedelta` class (ms storage, pandas-format string parsing, floor-modulo component decomposition matching pandas `days`/`seconds`/`microseconds`/`milliseconds`, `total_seconds`, arithmetic/comparison, `toString`) + `TimedeltaAccessor` (`Series.timedelta`: `total_seconds`, `days`, `seconds`, `microseconds`, `milliseconds`, `abs`, `neg`, `floor`/`ceil`/`round(freq)`)
- **Metric**: 33 (previous best: 32, delta: +1)
- **Commit**: 08d964f
- **Notes**: 68 tests (65 unit + 3 property-based). Key: don't add Timedelta to Scalar type (avoids circular dep chain) — accessor works with numbers-as-ms and strings. Two top-level regex for biome compliance. `floorDiv`/`floorMod` helpers for Python-style decomposition.

### Iteration 21 — 2026-04-04 12:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23979192962)

- **Status**: ✅ Accepted
- **Change**: `src/core/multi-index.ts` — `MultiIndex` class (levels+codes compressed storage, fromArrays/fromTuples/fromProduct, getLoc w/ partial keys, getLevelValues, droplevel, swaplevel, setNames/setLevels/setCodes, sortValues per-level direction, append, equals, toRecord, nunique, dropDuplicates, Symbol.iterator)
- **Metric**: 32 (previous best: 31, delta: +1)
- **Commit**: e8186ae
- **Notes**: 63 tests (60 unit + 3 property-based). Key learning: extract `buildTargetCodes`/`filterByTargetCodes`/`compareAtLevel`/`makeSortComparator` to stay under complexity 15. Avoid `toFrame()` due to potential circular imports; use `toRecord()` instead.

### Iteration 20 — 2026-04-04 12:30 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23978618596)

- **Status**: ✅ Accepted
- **Change**: `src/core/categorical.ts` — `Categorical` class (integer-coded fixed-vocabulary array), `CategoricalDtype` (metadata descriptor), `CategoricalAccessor` (`Series.cat`), `factorize()`. Added `.cat` getter to `Series`.
- **Metric**: 31 (previous best: 30, delta: +1)
- **Commit**: cd9c49c
- **Notes**: 55 unit + 3 property-based tests. Circular ESM dep (categorical↔series) is fine per prior pattern. `Array<T>` → `T[]` auto-fixed by biome --unsafe.

### Iteration 19 — 2026-04-04 11:42 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/23978159484)

- **Status**: ✅ Accepted
- **Change**: `src/stats/` — describe, corr/cov (Pearson/Spearman/Kendall), skew (G1), kurtosis (G2 excess).
- **Metric**: 30 (previous best: 26, delta: +4) · **Commit**: 26daef2

### Iterations 1–18 (summary)
- Iter 18 ✅ I/O: readCsv/readJson/toCsv/toJson (26) · Iter 17 ✅ window: rolling/expanding/ewm (22) · Iter 16 ✅ reshape: pivot/melt/stack (19)
- Iter 15 ✅ compare.ts (16) · Iter 14 ✅ indexing.ts (15) · Iter 13 ✅ sort.ts (14)
- Iter 12 ✅ datetime.ts (13) · Iter 11 ✅ missing.ts (12) · Iter 10 ✅ merge (11) · Iter 9 ✅ strings.ts (10)
- Iter 8 ✅ ops.ts (9) · Iter 7 ✅ concat (8) · Iter 6 ✅ GroupBy (7) · Iter 5 ✅ DataFrame (6) · Iter 4 ⚠️ Error · Iter 3 ✅ Dtype+Series (5) · Iter 2 ✅ Index+Dtype (4) · Iter 1 ✅ Foundation (1)
