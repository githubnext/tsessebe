# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T14:48:19Z |
| Iteration Count | 95 |
| Best Metric | 50 |
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

**Goal**: Build `tsb`, a complete TypeScript port of pandas, one feature at a time.
**Metric**: `pandas_features_ported` (higher is better)
**Branch**: `autoloop/build-tsb-pandas-typescript-migration-c9103f2f32e44258`
**Pull Request**: #54

---

## 🎯 Current Priorities

**Note**: The main branch was reset to 6 files (earlier branches were not merged). Iter 53 re-establishes the new long-running branch from main (6 files → 8). The branch history in the state file (iters 1–52) reflects previous diverged work.

Now at 50 files (iter 95). Next candidates:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/stats/pivot_table.ts` — pivot_table with aggregation functions
- `src/stats/melt_wide_to_long.ts` — melt wide-format DataFrame to long format (wide_to_long)

---

## 📚 Lessons Learned

- **Iter 95 (crosstab, 49→50)**: `crosstab` uses same `scalarKey()` pattern as `factorize` for stable Map keys. `collectUniques()` preserves first-seen order (matches pandas). `buckets` for values+aggfunc uses `Array.from<number[]|undefined>({length}, () => undefined)` for clean typing (avoids `fill(undefined)` `any[]` issue). Normalization applied before margins so margin totals reflect raw counts. Property tests: sum of all cells = n, normalize='all' grand sum ≈ 1, normalize='index' all row sums ≈ 1, normalize='columns' all col sums ≈ 1, margins All column = row sum.
- **Iter 94 (factorize, 48→49)**: `factorize` uses stable string key (`typeof v:String(v)`) to handle null/undefined/NaN separately. `useNaSentinel=true` assigns -1 to missing values. `sort=true` remaps via sorted array. Property tests: valid indices, no duplicate uniques, round-trip, sorted order.
- **Iter 93 (get_dummies, 47→48)**: `getDummies` collects unique non-missing values in first-seen order. Missing → 0 by default; `dummyNa: true` adds "NaN" column. `dropFirst` removes first category. `dataFrameGetDummies` uses column name as default prefix.
- **Iter 92 (datetime_tz, 46→47)**: `utcOffsetMs` uses `Intl.DateTimeFormat formatToParts` + two-step refinement for DST. `% 24` handles rare "24:00" midnight. Property tests: UTC round-trip, tz_convert preserves ms.
- **Iter 91 (add_sub_mul_div, 45→46)**: Commutative ops (add/mul) radd/rmul delegate to forward form. rsub/rdiv reverse operand order. Property tests use `fc.integer` to avoid float precision issues.
- **Iter 90 (pow_mod, 44→45)**: `_mod` uses `a - Math.floor(a/b)*b` to avoid overflow. `Math.floor(0/negative) = -0`; normalize with `r===0 ? 0 : r`. Property tests use integer inputs.
- **Iter 89 (numeric_ops, 43→44)**: Use `fc.double` (not `fc.float`). Exclude infinities from `sign(n)*abs(n)≈n` property test.
- **Iter 88 (DatetimeIndex/date_range/bdate_range, 42→43)**: `freqToOffset(freq, n)` takes multiplier. `negateOffset()` dispatches on `offset.name`.
- **Iter 87 (DateOffset, 41→42)**: 11 offset classes. Anchored use `Date.UTC(y, m+n+1, 0)` trick. UTC throughout.
- **Iter 86 (Timedelta/TimedeltaIndex, 40→41)**: Internal ms; `floorDiv` helper. `biome-ignore lint/style/noNonNullAssertion:` for bounds-checked access.
- **Iter 85 (Period/PeriodIndex, 39→40)**: Ordinal-based. Top-level regex. `default: throw` for exhaustiveness.
- **Iters 73–84**: fillna, interpolate, shift/diff, compare, where/mask, cut/qcut, interval, sample, apply, CategoricalIndex, pipe, DateOffset. Top-level regex. `extractName()` returns `string | null`. Barrel imports.
- **Iters 53–72**: GroupBy, merge, str, dt, describe, csv, json, corr, rolling, expanding, ewm, melt, pivot, stack/unstack, value_counts, elem_ops, cum_ops, nlargest, rank, MultiIndex.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**Current state (iter 92)**: 47 files — Series, DataFrame, GroupBy, concat, merge, str/dt/cat accessors, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops, stats/elem_ops, stats/value_counts, stats/where_mask, stats/compare, stats/shift_diff, stats/interpolate, stats/fillna, core/interval, stats/cut, stats/sample, stats/apply, core/categorical_index, stats/pipe, core/period, core/timedelta, core/date_offset, core/date_range, stats/numeric_ops, stats/pow_mod, stats/add_sub_mul_div, core/datetime_tz.

**Next**: io/read_excel (XLSX zero-dep parser) · stats/pivot_table · string_methods for StringDtype

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 95 — 2026-04-06 14:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24036457102)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/crosstab.ts` — `crosstab(index, columns, options?)` and `seriesCrosstab(a, b)` for cross-tabulation of two categorical factors.
- **Metric**: 50 (previous: 49, delta: +1)
- **Commit**: e74205d
- **Notes**: Supports margins (row/col totals), normalize ('all'/'index'/'columns'), values+aggfunc for custom aggregation, dropna=false keeps NaN as a category. Uses same scalarKey() approach as factorize for stable Map keys. 60+ unit tests + property-based tests (grand total = n, normalize sums, margins invariants).

### Iteration 94 — 2026-04-06 14:23 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24035525591)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/factorize.ts` — `factorize(values)` and `seriesFactorize(series)` for integer encoding of categorical variables.
- **Metric**: 49 (previous: 48, delta: +1)
- **Commit**: 38af66a
- **Notes**: Stable map key (`typeof:value`) handles null/NaN/undefined without collision. `useNaSentinel=true` (default) → missing gets -1, excluded from uniques. `sort=true` builds first-seen order then remaps via sorted array. 50+ unit tests + property tests (valid indices, no duplicate uniques, round-trip, sorted order). Playground tutorial added.

### Iteration 93 — 2026-04-06 13:33 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24033784622)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/get_dummies.ts` — `getDummies(series)` and `dataFrameGetDummies(df)` for one-hot encoding of categorical variables.
- **Metric**: 48 (previous: 47, delta: +1)
- **Commit**: f5174a0
- **Notes**: Unique values collected in first-seen order (pandas object dtype behaviour). Missing values encoded as 0 by default; `dummyNa: true` adds explicit NaN column. `dropFirst` removes first category to avoid dummy variable trap. DataFrame version uses column name as default prefix. 40+ unit + property tests covering row-sums, column counts, value range, prefix invariants.

### Iteration 92 — 2026-04-06 12:20 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24031504495)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/datetime_tz.ts` — `TZDatetimeIndex`, `tz_localize()`, `tz_convert()`. Timezone-aware DatetimeIndex using `Intl.DateTimeFormat` + two-step UTC offset refinement for DST handling.
- **Metric**: 47 (previous: 46, delta: +1)
- **Commit**: 7877c82
- **Notes**: `utcOffsetMs` uses `formatToParts` to get local time, computes `localMs - utcMs`. Two-step refinement handles spring-forward (shifts forward) and fall-back (uses EDT pre-transition). 55+ tests including NYC DST cases and property tests. `TZDatetimeIndex` has full API: sort, unique, filter, slice, concat (same-tz), contains, min, max, toLocalStrings, tz_convert, tz_localize_none.

### Iters 87–92 — ✅ DateOffset (41→42), date_range/DatetimeIndex (42→43), numeric_ops (43→44), pow_mod (44→45), add_sub_mul_div (45→46), datetime_tz (46→47)
### Iters 73–86 — ✅ where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, DateOffset (28→41)
### Iters 67–72 — ✅ value_counts, elem_ops, cum_ops, nlargest, rank, MultiIndex (22→28)
### Iters 60–66 — ✅ corr/cov, rolling, expanding×2, cat_accessor, melt+pivot, ewm, stack/unstack (15→22)
### Iterations 53–59 — ✅ GroupBy, merge, str, dt, describe/quantile, csv I/O, json I/O (8→14)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)
