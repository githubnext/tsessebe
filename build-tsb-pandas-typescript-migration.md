# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-22T03:41:00Z |
| Iteration Count | 238 |
| Best Metric | 115 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #174 |
| Steering Issue | #107 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, accepted, error, error, error, accepted, accepted, accepted, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)
**Pull Request**: #174 | **Steering Issue**: #107 | **Experiment Log**: #3

---

## 🎯 Current Priorities

- `stats/swaplevel.ts` ✅ iter 238: swapLevelDataFrame/swapLevelSeries/reorderLevelsDataFrame/reorderLevelsSeries
- `stats/truncate.ts` ✅ iter 238: truncateDataFrame/truncateSeries
- `core/str_accessor` — add `.str.extractall()` method (blocked by circular dep; standalone `strExtractAll` already in string_ops.ts)
- Next: `stats/melt_extended.ts` — wide_to_long helper / melt with value_vars patterns
- Next: `stats/notna_boolean.ts` — boolean indexing helpers (keepTrue/keepFalse/filterBy)

---

## 📚 Lessons Learned

- **Biome**: `useBlockStatements --write --unsafe`. `Number.NaN`/`Number.POSITIVE_INFINITY`. Default import fc. `import type` for value-unused imports.
- **TypeScript**: `(value as unknown) instanceof X` for instanceof. `as Scalar`/`as number` for noUncheckedIndexedAccess. `readonly T[]`. Extract helpers for ≤15 complexity. `df.columns.values` (not `.map(String)`) — `df.columns` is `Index<string>`. `(record[key] as T[]).push(v)` for pre-initialized Record dicts.
- **MultiIndex**: Does not extend `Index<Label>`. Use `mi as unknown as Index<Label>` cast when passing to Series/DataFrame constructor. `mi.at(i)` returns `readonly Label[]`. `mi.size` for length.
- **Tests**: Import from `../../src/index.ts`. `Series<Scalar>` type. `fc.float({ noNaN: true, noDefaultInfinity: true })` to avoid Infinity in multiply-by-zero tests.
- **MCP safeoutputs**: `push_to_pull_request_branch` (not create) when PR exists. Use PR #174.
- **Regex**: Global regex requires `lastIndex=0` reset before reuse. `strFindall` stores matches as JSON strings (Scalar-compatible). `strFindallExpand` uses dummy `re.exec("")` for named group detection.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame` (creates circular: `string_accessor → frame → series → string_accessor`). Use standalone stat functions for anything returning a DataFrame.
- **Label comparison**: Use `(value as unknown as number) < (bound as unknown as number)` for `<`/`>` on `Label` — TypeScript doesn't allow these operators on union types. This pattern is provably safe for number and string labels.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `core/str_accessor` — wire `.str.extractall()` via late-binding (inject DataFrame factory)
- `str.normalize()` — Unicode normalization (NFC/NFD/NFKC/NFKD) on StringAccessor
- `stats/melt_extended.ts` — wide_to_long, melt with value_vars patterns
- `stats/notna_boolean.ts` — boolean indexing helpers

---

## 📊 Iteration History

### Iter 238 — 2026-04-22 03:41 UTC — ⏳ CI pending — +swapLevelDataFrame/swapLevelSeries/reorderLevels + truncateDataFrame/truncateSeries. Metric: 115 (+2). Commit: 04243a5. [Run](https://github.com/githubnext/tsessebe/actions/runs/24758931868)
### Iter 237 — 2026-04-22 00:42 UTC — ✅ +cutBinsToFrame/cutBinCounts/binEdges + xsDataFrame/xsSeries. Metric: 113 (+2). Commit: b542fde. [Run](https://github.com/githubnext/tsessebe/actions/runs/24753646544)
### Iter 236 — 2026-04-21 23:16 UTC — (state discrepancy: commit 7dc2dc8 not found in branch; iter 237 re-implements same metric) [Run](https://github.com/githubnext/tsessebe/actions/runs/24751361866)
### Iter 235 — 2026-04-21 22:18 UTC — ✅ +strFindall/strFindallCount/strFindFirst/strFindallExpand + toJsonDenormalize/toJsonRecords/toJsonSplit/toJsonIndex. Metric: 111. Commit: 3f9fcf0. [Run](https://github.com/githubnext/tsessebe/actions/runs/24749266130)
### Iter 234 — 2026-04-21 21:47 UTC — ✅ Fix eval_query tests + add strFindall/strFindallCount/strFindFirst. Metric: 110. Commit: 72160d1. [Run](https://github.com/githubnext/tsessebe/actions/runs/24748075361)
### Iters 218–234 — ✅/⚠️ (metrics 51→110): +jsonNormalize(51), +readExcel(50), +nancumops(58), to_timedelta push failures(224-228), +to_timedelta(60), +date_range(61), +timedelta_range(108), +unique/between(110), +queryDataFrame/evalDataFrame(110), fix eval_query+fromArrays(110).
### Iters 53–217 — ✅/⚠️ (metrics 8→50): selectDtypes, interpolate, factorize, pivotTable, crosstab, getDummies, Interval, cut/qcut, clip, sample, duplicated, diff_shift, where_mask, replace, astype, idxmin/idxmax, na_ops, 22+ core features.
