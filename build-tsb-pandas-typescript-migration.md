# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T15:40:00Z |
| Iteration Count | 288 |
| Best Metric | 136 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | pending-ci |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, accepted, pending-ci, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: pending-ci | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core (iters 1–52), Stats (53–244), various ops (246–288)
- ✅ Through iter 288: itertuples added. 136 features on branch.
- Next: convert_dtypes, to_html on DataFrame/Series, Flags, api.types

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size`. `Series<Scalar>`. Non-null `arr[i]!` for noUncheckedIndexedAccess.
- **Biome**: `useBlockStatements`. `Number.NaN`. Default import fc. `import type` for unused imports.
- **Label includes Date**: Fix 8d2e375.
- **Imports**: `src/stats/*.ts` imports from `../core`, `../types.ts`, or siblings. Tests from `../../src/index.ts`.
- **TypeScript**: `as Scalar`/`as number` for noUncheckedIndexedAccess. `df.columns.values`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **CI action_required**: Means human approval needed, not test failure.
- **git stash**: Does NOT stash untracked files.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `convert_dtypes()` — convert to best-fit dtypes
- `DataFrame.toHtml()` / `Series.toHtml()` — standalone HTML rendering
- `pd.Flags` — DataFrame.flags attribute
- `pd.api.types` — type-checking utilities
- `str.extractall()` — wire via late-binding

---

## 📊 Iteration History

### Iteration 288 — 2026-04-25 15:40 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24934236156)

- **Status**: ⏳ pending-ci
- **Change**: +itertuples — iterate over DataFrame rows as plain JS objects
- **Metric**: 136 (delta: +1 from main baseline 135)
- **Commit**: ee442e9

### Iteration 287 — 2026-04-25 14:15 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24932687823)

- **Status**: ⏳ pending-ci
- **Change**: +dropLevelSeries / dropLevelDataFrame
- **Metric**: 136 (delta: 0 on main)
- **Commit**: 27d992a

### Iters 273–286 — accepted/pending-ci (130→136): +lreshape, +strCenter/strLjust/strRjust/strZfill/strWrap, +strGetDummies, +swapaxes, +readFwf, +unionCategoricals, +strCat, +asfreq, +atTime/betweenTime, +extractAll, +firstRows/lastRows, +monthName/dayName.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
