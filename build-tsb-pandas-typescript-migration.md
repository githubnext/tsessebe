# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-29T04:44:00Z |
| Iteration Count | 294 |
| Best Metric | 137 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | pending-ci |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, pending-ci, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: pending-ci | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core + Stats + IO + Merge + Reshape + Window + GroupBy complete (iters 1–294)
- ✅ 137 features on branch. Next: pd.Grouper, pd.api.types extensions, pd.util.hash_array()

---

## 📚 Lessons Learned

- **CI type errors**: `Index<Label>.size`. `Series<Scalar>`. Non-null `arr[i]!` for noUncheckedIndexedAccess.
- **Biome**: `useBlockStatements`. `Number.NaN`. Default import fc. `import type` for unused imports.
- **Imports**: `src/stats/*.ts` from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **TypeScript**: `as Scalar`/`as number` for noUncheckedIndexedAccess. `df.columns.values`.
- **MultiIndex**: `mi as unknown as Index<Label>`. `mi.at(i)` returns `readonly Label[]`.
- **Circular deps**: `string_accessor.ts` cannot import `DataFrame`.
- **CI action_required**: Human approval needed, not test failure.
- **to_html**: Use df.col(col).at(i) for cell values; df.index.at(i) for index labels.
- **Baseline metric**: Always check `main` baseline. Branch fast-forwarded when ahead=0.
- **hash_pandas_object**: Use `s.iat(i)` + `s.index.at(i)`. Result: `new Series(hashes, { index: s.index, dtype: "float64" })`.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `pd.Grouper` class — groupby helper
- `pd.api.types` extensions — more type predicates
- More string ops, `str.extractall()` late-binding
- `pd.util.hash_array()` — hash an array of values
- `DataFrame.items()` / `Series.items()` — iterate as (label, value) pairs

---

## 📊 Iteration History

### Iteration 294 — 2026-04-29 04:44 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25091308179)

- **Status**: ⏳ pending-ci
- **Change**: +hashPandasObject — FNV-1a 64-bit hash per element/row
- **Metric**: 137 (previous best: 136, delta: +1)
- **Commit**: d8a133d
- **Notes**: src/stats/hash_pandas_object.ts. Hashes Series elements or DataFrame rows via FNV-1a 64-bit. index=false excludes index from hash.

### Iters 285–293 — pending-ci/accepted (133→136): +info, +extractAll, +firstRows/lastRows, +monthName/dayName, +itertuples, +dropLevel, +flags, +to_html, +hashPandasObject(prev attempt).

### Iters 273–284 — pending-ci/accepted (130→133): +lreshape, +strCenter/Ljust/Rjust/Zfill/Wrap, +strGetDummies, +swapaxes, +readFwf, +unionCategoricals.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
