# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T20:47:00Z |
| Iteration Count | 107 |
| Best Metric | 62 |
| Target Metric | — |
| Branch | `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258` |
| PR | #54 |
| Steering Issue | — |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258`
**Pull Request**: #54

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 62 files (iter 107). Next candidates:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/natsort.ts` — natural-sort for string indexes / columns
- `src/stats/dropna.ts` — standalone dropna() for Series/DataFrame (vs. methods already on class)

---

## 📚 Lessons Learned

- **Iter 107 (notna/isna)**: `SeriesOptions.name` is `string | null` (not `string | undefined`) — pass `s.name` directly. The `missing()` helper `v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))` is the canonical missing test. Falsy-but-present values (0, "", false) are NOT missing. `isnull`/`notnull` are simple `const` aliases (`export const isnull = isna`). DataFrame overload builds a `Map<string, Series<Scalar>>` with `df.index` (already `Index<Label>`, no cast needed). 45 tests (unit + property-based).
- **Iter 106 (infer_dtype)**: `inferDtype(values, {skipna})` uses `unknown[]` input type (not `Scalar[]`) so specialised objects like `Timestamp`, `Timedelta`, `Period`, `Interval` pass type-checks cleanly. The `classifyOne()` helper uses `instanceof` guards in precedence order (Timestamp before Date, since Timestamp extends nothing but must not accidentally match Date). `skipna=true` skips nulls; when all non-null kinds form a Set of size 1 the output is deterministic. 45 tests (unit + property-based).
- **Iter 105 (pivotTableFull)**: Grand-total margins computed from raw data values (not re-aggregated cells) ensures mean/sum/count are all correct for "All" row/column. `marginValue()` helper concatenates all buckets for a fixed row or column key across all opposite keys. `sort=true` default mirrors pandas behavior. `rowKeyToLabel()` handles composite multi-key rows. The `as Label[]` cast removed since `Label[]` is directly assignable to `readonly Label[]`.
- **Iter 104 (clip_with_bounds)**: `resolveBound()` helper unifies scalar/array/Series bounds into a per-element `(number|null)[]`. `Array.isArray` distinguishes arrays from Series at runtime. DataFrame element-wise clip handled by `_clipDFElementWise()`. When one bound is a DataFrame, the other is treated as scalar-only (array/Series non-DataFrame bounds are unsupported in element-wise mode — document the limitation).
- **Iter 103 (dataFrameAssign)**: Callable specifiers need to receive the in-progress `working` DataFrame (updated after each step) — not the original `df`. The helper `_addOrReplaceColumn` preserves column order for replacements by iterating existing column names and substituting in-place. `import type { Scalar }` is sufficient — no need to import `Label` or `Index` in the assign module.
- **Iter 102 (NamedAgg)**: Circular value imports between `groupby.ts` and `named_agg.ts` avoided by using only `import type` for cross-dependencies. The internal `_resolveColSpecs` type was updated from `ReadonlyMap<string, AggFn>` to `ReadonlyMap<string, { srcCol: string; fn: AggFn }>` to cleanly separate output column name from source column.
- **Iter 101 (select_dtypes)**: `DataFrame.fromColumns` accepts only plain arrays — passing a `Series` with custom `Dtype` loses the dtype. Use `new DataFrame(new Map(...), rowIndex)` directly to preserve custom dtypes. `fc.float()` requires 32-bit boundaries — use `fc.double()` for general floats.
- **Iter 100 (memory_usage)**: RangeIndex cost = constant 24 bytes. Variable-width dtypes: 8 bytes/element shallow; `length*2+56` for strings when deep=true.
- **Iter 99 (Timestamp)**: `RawTimestamp` sentinel avoids JS `#` private field breakage. Two-step DST offset refinement for `wallClockToUtc`. `Intl.DateTimeFormat formatToParts` for tz-aware components.
- **Iter 98 (to_numeric)**: `tryConvert` returns discriminated union `{ok,value}`. Three overloads need `T extends Scalar` constraint.
- **Iter 97 (json_normalize)**: Recursive `flattenObject(obj, sep, maxLevel, prefix, depth)`. Arrays at leaf positions JSON-stringified.
- **Iters 89–96**: Use `fc.double` not `fc.float`. `_mod = a - Math.floor(a/b)*b`. Commutative ops delegate to forward form.
- **Iters 53–88**: GroupBy/merge/str/dt, describe, csv/json, corr, rolling/expanding/ewm, reshape, MultiIndex, datetime/timedelta/period, cut/qcut, sample, apply, pipe, factorize, get_dummies, crosstab.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**State (iter 107)**: 62 files. Next: io/read_excel (XLSX zero-dep) · core/natsort (natural-sort for string indexes) · stats/where_na (dropna for series/dataframe standalone funcs)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 107 — 2026-04-06 20:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24050415894)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/notna.ts` — `isna`/`notna`/`isnull`/`notnull` element-wise missing-value detection. Works on scalars, arrays, Series, DataFrames. `isnull`/`notnull` are const aliases.
- **Metric**: 62 (previous: 61, delta: +1)
- **Commit**: 6a725aa
- **Notes**: `SeriesOptions.name` is `string | null`, not `string | undefined` — must pass `s.name` directly. 45 unit + property-based tests. All pass.

### Iteration 106 — 2026-04-06 20:25 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24049095921)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/infer_dtype.ts` — `inferDtype()` function mirroring `pandas.api.types.infer_dtype`. Accepts `readonly unknown[] | Series`, returns a string dtype label.
- **Metric**: 61 (previous: 60, delta: +1)
- **Commit**: 3752995
- **Notes**: `unknown[]` input type enables passing `Timestamp`/`Timedelta`/`Period`/`Interval` objects without casts. 45 tests (unit + property-based). All pass.

### Iteration 105 — 2026-04-06 19:49 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24048046275)

- **Status**: ✅ Accepted
- **Change**: Added `src/reshape/pivot_table.ts` — `pivotTableFull()` with `margins`, `margins_name`, `sort` options. Mirrors `pandas.pivot_table`.
- **Metric**: 60 (previous: 59, delta: +1)
- **Commit**: abcd0e7
- **Notes**: Grand totals computed from raw data buckets (not re-aggregated cells) — ensures correctness for mean/sum/count. `marginValue()` concatenates all buckets for a fixed key across opposite keys. 22 unit + 3 property tests.

### Iteration 104 — 2026-04-06 19:45 UTC
- **Status**: ✅ Accepted | **Metric**: 59 (+1) | **Commit**: 8b15cb0
- **Change**: `src/stats/clip_with_bounds.ts` — clipSeriesWithBounds/clipDataFrameWithBounds with per-element Series/array/DataFrame bounds.

### Iteration 103 — 2026-04-06 18:49 UTC
- **Status**: ✅ Accepted | **Metric**: 58 (+1) | **Commit**: 945b4a5
- **Change**: `src/core/assign.ts` — dataFrameAssign() with callable support; callables receive in-progress DataFrame.

### Iteration 102 — 2026-04-06 18:21 UTC
- **Status**: ✅ Accepted | **Metric**: 57 (+1) | **Commit**: 9f8a10b
- **Change**: `src/groupby/named_agg.ts` — NamedAgg class + DataFrameGroupBy.aggNamed().

### Iteration 101 — 2026-04-06 17:47 UTC
- **Status**: ✅ Accepted | **Metric**: 56 (+1) | **Commit**: dd08080
- **Change**: `src/stats/select_dtypes.ts` — selectDtypes(df, { include, exclude }).

### Iteration 100 — 2026-04-06 17:19 UTC
- **Status**: ✅ Accepted | **Metric**: 55 (+1) | **Commit**: b76afce
- **Change**: `src/stats/memory_usage.ts` — seriesMemoryUsage / dataFrameMemoryUsage.

### Iteration 99 — 2026-04-06 16:48 UTC
- **Status**: ✅ Accepted | **Metric**: 54 (+1) | **Commit**: 42be823
- **Change**: `src/core/timestamp.ts` — Timestamp class (pandas.Timestamp port)

### Iteration 98 — 2026-04-06 16:18 UTC
- **Status**: ✅ Accepted | **Metric**: 53 (+1) | **Commit**: 70e1aeb
- **Change**: `src/stats/to_numeric.ts` — coerce scalars/arrays/Series to numeric types

### Iters 96–97 — ✅ wide_to_long (50→51), json_normalize (51→52)
### Iters 92–95 — ✅ datetime_tz (46→47), get_dummies (47→48), factorize (48→49), crosstab (49→50)
### Iters 87–91 — ✅ DateOffset (41→42), date_range/DatetimeIndex (42→43), numeric_ops (43→44), pow_mod (44→45), add_sub_mul_div (45→46)
### Iters 73–86 — ✅ where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, DateOffset (28→41)
### Iters 67–72 — ✅ value_counts, elem_ops, cum_ops, nlargest, rank, MultiIndex (22→28)
### Iters 60–66 — ✅ corr/cov, rolling, expanding×2, cat_accessor, melt+pivot, ewm, stack/unstack (15→22)
### Iterations 53–59 — ✅ GroupBy, merge, str, dt, describe/quantile, csv I/O, json I/O (8→14)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)
