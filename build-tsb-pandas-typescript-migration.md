# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T18:29:00Z |
| Iteration Count | 290 |
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
| Recent Statuses | pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: pending-ci | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core (iters 1–52), Stats (53–244), various ops (246–290)
- ✅ Through iter 290: itertuples + Flags added. 136 features on branch.
- Next: DataFrame.toHtml/Series.toHtml standalone, pd.api.types extensions, str.extractall wiring

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
- **to_html**: Use df.col(col).at(i) for cell values; df.index.at(i) for index labels.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `DataFrame.toHtml()` / `Series.toHtml()` — standalone HTML rendering (Styler.toHtml exists, need standalone)
- `pd.api.types` extensions — more type predicates
- `str.extractall()` — wire via late-binding
- `DataFrame.convert_dtypes()` — already exported, check if more refinement needed

---

## 📊 Iteration History

### Iteration 290 — 2026-04-25 18:29 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24937530889)

- **Status**: ⏳ pending-ci
- **Change**: +DataFrame.itertuples() + Flags class (df.flags attribute)
- **Metric**: 136 (delta: +1 new file from main baseline 135)
- **Commit**: 78189c0
- **Notes**: Added itertuples generator method to DataFrame and new Flags class with allows_duplicate_labels property.

### Iteration 289 — 2026-04-25 16:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24935744381)

- **Status**: ⏳ pending-ci
- **Change**: +to_html — dataFrameToHtml / seriesToHtml for HTML table rendering
- **Metric**: 136 (delta: +1 from main baseline 135)
- **Commit**: 4e55926

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
