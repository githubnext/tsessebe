# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T10:15:00Z |
| Iteration Count | 88 |
| Best Metric | 43 |
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

Now at 43 files (iter 88). Next candidates:
- `src/stats/numeric_ops.ts` — additional numeric ops: floor(), ceil() for Series/DataFrame (abs/round already in elem_ops)
- `src/core/datetime_tz.ts` — timezone-aware DatetimeIndex with tz_localize / tz_convert

---

## 📚 Lessons Learned

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

**Current state (iter 88)**: 43 files — Series, DataFrame, GroupBy, concat, merge, str/dt/cat accessors, stats/describe, io/csv, io/json, stats/corr, window/rolling, window/expanding, window/ewm, reshape/melt, reshape/pivot, reshape/stack_unstack, MultiIndex, stats/rank, stats/nlargest, stats/cum_ops, stats/elem_ops, stats/value_counts, stats/where_mask, stats/compare, stats/shift_diff, stats/interpolate, stats/fillna, core/interval, stats/cut, stats/sample, stats/apply, core/categorical_index, stats/pipe, core/period, core/timedelta, core/date_offset, core/date_range.

**Next**: additional numeric ops (floor/ceil for Series/DataFrame) · tz-aware DatetimeIndex

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 88 — 2026-04-06 10:15 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24027453779)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/date_range.ts` — `DatetimeIndex`, `date_range()`, `bdate_range()`, `resolveFreq()` with 16 frequency aliases.
- **Metric**: 43 (previous: 42, delta: +1)
- **Commit**: 9795038
- **Notes**: `freqToOffset(freq, n)` takes multiplier directly (enables QS=MonthBegin(3)). `negateOffset()` dispatches on `offset.name` for clean backward generation. 104 unit + property tests, 100% coverage.

### Iteration 87 — 2026-04-06 09:42 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24026629763)

- **Status**: ✅ Accepted
- **Change**: Added `src/core/date_offset.ts` — `DateOffset` interface plus `Day`, `Hour`, `Minute`, `Second`, `Milli`, `Week` (weekday alignment), `MonthEnd`, `MonthBegin`, `YearEnd`, `YearBegin`, `BusinessDay`.
- **Metric**: 42 (previous: 41, delta: +1)
- **Commit**: 3f80806
- **Notes**: Anchored offsets use `Date.UTC(y, m+n+1, 0)` (day 0 trick) for O(1) arithmetic. UTC throughout. 100+ unit + property tests.

### Iteration 86 — 2026-04-06 08:35 UTC — ✅ Timedelta/TimedeltaIndex (40→41) commit: de7820d
### Iteration 85 — 2026-04-06 07:35 UTC — ✅ Period/PeriodIndex (39→40) commit: 37c28bf
### Iteration 84 — 2026-04-06 06:50 UTC — ✅ pipe/pipeChain/pipeTo (38→39) commit: 09f54f9
### Iteration 83 — 2026-04-06 05:49 UTC — ✅ CategoricalIndex (37→38) commit: 7444b7d
### Iteration 82 — 2026-04-06 05:07 UTC — ✅ apply/applymap/dataFrameApply (36→37) commit: 78354b8
### Iteration 81 — 2026-04-06 03:41 UTC — ✅ sample (35→36) commit: 2291bd9
### Iteration 79 — 2026-04-06 01:06 UTC — ✅ cut/qcut (34→35) commit: f26b4cc
### Iteration 78 — 2026-04-06 00:29 UTC — ✅ Interval/IntervalIndex (33→34) commit: 281be7f
### Iteration 77 — 2026-04-05 23:45 UTC — ✅ fillna (32→33)
### Iteration 76 — 2026-04-05 23:11 UTC — ✅ interpolate (31→32)
### Iteration 75 — 2026-04-05 22:50 UTC — ✅ shift_diff (30→31)
### Iteration 74 — 2026-04-05 22:09 UTC — ✅ compare (29→30)
### Iteration 73 — 2026-04-05 21:50 UTC — ✅ where_mask (28→29)
### Iters 67–72 — ✅ value_counts, elem_ops, cum_ops, nlargest, rank, MultiIndex (22→28)
### Iters 60–66 — ✅ corr/cov, rolling, expanding×2, cat_accessor, melt+pivot, ewm, stack/unstack (15→22)
### Iterations 53–59 — ✅ GroupBy, merge, str, dt, describe/quantile, csv I/O, json I/O (8→14)
### Iterations 1–52 — ✅ Foundation + earlier pandas features (old branches)
