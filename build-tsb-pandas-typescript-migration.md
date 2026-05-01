# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-01T07:10:56Z |
| Iteration Count | 298 |
| Best Metric | 138 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #248 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted |

---

## 📋 Program Info

**Goal**: Build tsb — TypeScript port of pandas, one feature at a time.
**Metric**: pandas_features_ported (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration` | **PR**: #248 | **Issue**: #1

---

## 🎯 Current Priorities

- ✅ Core + Stats + IO + Merge + Reshape + Window + GroupBy complete (iters 1–295)
- ✅ hashPandasObject added (iter 296)
- ✅ hashArray + Series.items()/iteritems() added (iters 297–298)
- Next: `pd.Grouper`, `pd.util.hash_biject_array()`, `DataFrame.itertuples()`, more `pd.api.types` predicates

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
- **DataFrame construction in tests**: Use `DataFrame.fromColumns({...})` not `new DataFrame({...})`. Use default `fc` import, not `* as fc`.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

- `pd.Grouper` — spec object for groupby/resample
- More `pd.api.types` predicates (is_float_dtype, is_integer_dtype, etc.)
- `pd.util.hash_biject_array()` — hash bijection for deduplicated categorical arrays
- `DataFrame.itertuples()` — iterate rows as named tuples

---

## 📊 Iteration History

### Iteration 298 — 2026-05-01 07:10 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25206042458)

- **Status**: ⏳ pending-ci
- **Change**: +hashArray (element-wise FNV-1a hashing) + Series.items()/iteritems()
- **Metric**: 138 (previous best: 138, delta: +1)
- **Commit**: 0d3f073
- **Notes**: hashArray mirrors pd.util.hash_array; Series.items/iteritems yield (label, value) pairs.

### Iters 296–297 — pending-ci (137→138): +hashPandasObject (FNV-1a 64-bit hashing), +hashArray + Series.items()/iteritems() (pending CI, same metric as 298).

### Iters 273–295 — pending-ci/accepted (130→137): +Grouper, +lreshape, +strCenter/Ljust/Rjust/Zfill/Wrap, +strGetDummies, +swapaxes, +readFwf, +unionCategoricals, +info, +extractAll, +firstRows/lastRows, +monthName/dayName, +itertuples, +dropLevel, +flags, +to_html.

### Iters 1–272 — accepted (0→130): full pandas core + stats + io + merge + reshape + window + groupby.
