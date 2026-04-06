# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T12:20:00Z |
| Iteration Count | 92 |
| Best Metric | 47 |
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

Now at 47 files (iter 92). Next candidates:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/stats/string_methods.ts` — string dtype operations (StringDtype Series operations)
- `src/core/sparse.ts` — SparseArray / SparseDtype

---

## 📚 Lessons Learned

- **Iter 92 (datetime_tz, 46→47)**: `utcOffsetMs(utcMs, tz)` uses `Intl.DateTimeFormat("en-CA", {hour12:false}).formatToParts()` to extract local time components, then computes `localMs - utcMs`. Two-step refinement (`off1=utcOffsetMs(wallMs)`, `est=wallMs-off1`, `off2=utcOffsetMs(est)`, result=`wallMs-off2`) correctly handles both spring-forward (shifts forward) and fall-back (uses pre-transition EDT). `% 24` on hour handles the rare "24:00" midnight representation. Test NYC EST (+5h), EDT (+4h), IST (+5:30h), UTC (identity). Property tests: UTC round-trip, tz_convert preserves ms, filter complement partition.
- **Iter 91 (add_sub_mul_div, 45→46)**: For commutative ops (add/mul), radd/rmul simply delegate to the forward form. For rsub/rdiv, reverse the operand order with a separate lambda. Property tests for `add+sub` inverse and `mul+div` inverse are clean with `fc.integer` to avoid float precision issues. Distributive law tests (mul over add) are valid for integers too.
- **Iter 90 (pow_mod, 44→45)**: `_mod` must use `a - Math.floor(a/b)*b` (not `((a%b)+b)%b`) to avoid addition overflow for large floats near `Number.MAX_VALUE`. `Math.floor(0/negative) = -0`; normalize with `r === 0 ? 0 : r`. Property tests for floating-point mod/floordiv identities must use integer inputs (`fc.integer`) to avoid subnormal precision failures.
- **Iter 89 (numeric_ops, 43→44)**: `fc.float` requires 32-bit float bounds (use `fc.double` for double constraints). Property `sign(n)*abs(n)≈n` fails for ±Infinity via `Inf-Inf=NaN`; exclude infinities with `noDefaultInfinity:true`. Grouped floor/ceil/trunc/sqrt/exp/log*/sign in one module — 82 tests, 100% coverage.
- **Iter 88 (DatetimeIndex/date_range/bdate_range, 42→43)**: `freqToOffset(freq, n)` takes multiplier (QS=MonthBegin(3)). `negateOffset()` dispatches on `offset.name`. 104 tests, 100% coverage.
- **Iter 87 (DateOffset, 41→42)**: 11 offset classes. Anchored use `Date.UTC(y, m+n+1, 0)` trick. UTC throughout.
- **Iter 86 (Timedelta/TimedeltaIndex, 40→41)**: Internal ms; `floorDiv` helper. `biome-ignore lint/style/noNonNullAssertion:` for bounds-checked access.
- **Iter 85 (Period/PeriodIndex, 39→40)**: Ordinal-based. Top-level regex. `default: throw` for exhaustiveness.
- **Iter 84 (pipe, 38→39)**: Variadic-generic `<A extends unknown[], R>(fn, ...args: A)`.
- **Iters 73–83**: fillna, interpolate, shift/diff, compare, where/mask, cut/qcut, interval, sample, apply, CategoricalIndex. Top-level regex. `extractName()` returns `string | null`. Barrel imports.
- **Iters 53–72**: GroupBy, merge, str, dt, describe, csv, json, corr, rolling, expanding, ewm, melt, pivot, stack/unstack, value_counts, elem_ops, cum_ops, nlargest, rank, MultiIndex. `*SeriesLike` interfaces. `scalarKey` for Map keys.

---

## 🚧 Foreclosed Avenues

- *(none)*

---

## 🔭 Future Directions

**Current state (iter 92)**: 47 files — Series, DataFrame, GroupBy, concat, merge, str/dt/cat accessors, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops, stats/elem_ops, stats/value_counts, stats/where_mask, stats/compare, stats/shift_diff, stats/interpolate, stats/fillna, core/interval, stats/cut, stats/sample, stats/apply, core/categorical_index, stats/pipe, core/period, core/timedelta, core/date_offset, core/date_range, stats/numeric_ops, stats/pow_mod, stats/add_sub_mul_div, core/datetime_tz.

**Next**: io/read_excel (XLSX zero-dep parser) · string_methods for StringDtype · sparse arrays

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 92 — 2026-04-06 12:20 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24031504495)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/datetime_tz.ts` — `TZDatetimeIndex`, `tz_localize()`, `tz_convert()`. Timezone-aware DatetimeIndex using `Intl.DateTimeFormat` + two-step UTC offset refinement for DST handling.
- **Metric**: 47 (previous: 46, delta: +1)
- **Commit**: 7877c82
- **Notes**: `utcOffsetMs` uses `formatToParts` to get local time, computes `localMs - utcMs`. Two-step refinement handles spring-forward (shifts forward) and fall-back (uses EDT pre-transition). 55+ tests including NYC DST cases and property tests. `TZDatetimeIndex` has full API: sort, unique, filter, slice, concat (same-tz), contains, min, max, toLocalStrings, tz_convert, tz_localize_none.

### Iteration 91 — 2026-04-06 11:48 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24030601247)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/add_sub_mul_div.ts` — `seriesAdd`/`seriesSub`/`seriesMul`/`seriesDiv` and reversed counterparts (`seriesRadd`/`seriesRsub`/`seriesRmul`/`seriesRdiv`) plus DataFrame equivalents.
- **Metric**: 46 (previous: 45, delta: +1)
- **Commit**: a919aed
- **Notes**: Commutative ops (add/mul) delegate radd/rmul to the forward form. rsub/rdiv use a reversed lambda. 50+ property and unit tests, 100% coverage. IEEE-754 division-by-zero semantics preserved.

### Iteration 90 — 2026-04-06 11:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24029842441)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/pow_mod.ts` — `seriesPow`/`dataFramePow`, `seriesMod`/`dataFrameMod`, `seriesFloorDiv`/`dataFrameFloorDiv`. Python/pandas sign semantics for mod; floor-toward-−∞ for floordiv.
- **Metric**: 45 (previous: 44, delta: +1)
- **Commit**: dbe17ed
- **Notes**: `_mod` uses `a - floor(a/b)*b` to avoid addition overflow near MAX_VALUE. Normalize `-0 → 0`. Property tests for mod/floordiv must use `fc.integer` — float subnormals break the Euclidean identity. 36 tests, 100% coverage.

### Iteration 89 — 2026-04-06 10:32 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24028449864)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/numeric_ops.ts` — `floor`, `ceil`, `trunc`, `sqrt`, `exp`, `log`, `log2`, `log10`, `sign` for Series and DataFrame.
- **Metric**: 44 (previous: 43, delta: +1)
- **Commit**: 34d33df
- **Notes**: `fc.float` requires 32-bit float bounds; used `fc.double` for property tests. `sign(n)*abs(n)≈n` property fails for ±Infinity due to `Inf-Inf=NaN`; fixed with `noDefaultInfinity:true`. 82 tests, 100% coverage on new file.

- **Status**: ✅ Accepted
- **Change**: Added `src/core/date_range.ts` — `DatetimeIndex`, `date_range()`, `bdate_range()`, `resolveFreq()` with 16 frequency aliases.
- **Metric**: 43 (previous: 42, delta: +1)
- **Commit**: 9795038
- **Notes**: `freqToOffset(freq, n)` takes multiplier directly (enables QS=MonthBegin(3)). `negateOffset()` dispatches on `offset.name` for clean backward generation. 104 unit + property tests, 100% coverage.

### Iters 87–91 — ✅ DateOffset (41→42), date_range/DatetimeIndex (42→43), numeric_ops (43→44), pow_mod (44→45), add_sub_mul_div (45→46)
### Iters 73–86 — ✅ where_mask, compare, shift_diff, interpolate, fillna, Interval, cut/qcut, sample, apply, CategoricalIndex, pipe, Period, Timedelta, DateOffset (28→41)
### Iters 67–72 — ✅ value_counts, elem_ops, cum_ops, nlargest, rank, MultiIndex (22→28)
### Iters 60–66 — ✅ corr/cov, rolling, expanding×2, cat_accessor, melt+pivot, ewm, stack/unstack (15→22)
### Iterations 53–59 — ✅ GroupBy, merge, str, dt, describe/quantile, csv I/O, json I/O (8→14)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)
