# Autoloop: build-tsb-pandas-typescript-migration

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-06T17:47:57Z |
| Iteration Count | 101 |
| Best Metric | 56 |
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

Now at 56 files (iter 101). Next candidates:
- `src/io/read_excel.ts` — Excel file reader (XLSX parsing, zero-dep)
- `src/core/named_agg.ts` — NamedAgg for GroupBy
- `src/stats/clip_with_bounds.ts` — DataFrame.clip() enhancements with lower/upper Series

---

## 📚 Lessons Learned

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

**State (iter 101)**: 56 files. Next: io/read_excel (XLSX zero-dep) · core/named_agg (NamedAgg for GroupBy)

---

## 📊 Iteration History

All iterations in reverse chronological order (newest first).

### Iteration 101 — 2026-04-06 17:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24043124230)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/select_dtypes.ts` — `selectDtypes(df, { include, exclude })` mirroring `pandas.DataFrame.select_dtypes()`.
- **Metric**: 56 (previous: 55, delta: +1)
- **Commit**: dd08080
- **Notes**: Supports generic aliases ("number", "integer", "signed integer", "unsigned integer", "floating", "bool", "string", "datetime", "timedelta", "category") and concrete dtype names. `DataFrame.fromColumns` loses custom dtypes — must use constructor directly for tests. 30 unit + property tests.

### Iteration 100 — 2026-04-06 17:19 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24042025179)

- **Status**: ✅ Accepted
- **Change**: Added `src/stats/memory_usage.ts` — `seriesMemoryUsage` and `dataFrameMemoryUsage` mirroring `pandas.Series.memory_usage()` / `pandas.DataFrame.memory_usage()`.
- **Metric**: 55 (previous: 54, delta: +1)
- **Commit**: b76afce
- **Notes**: RangeIndex cost is constant 24 bytes (only start/stop/step stored). Variable-width dtypes use POINTER_SIZE=8 bytes per element when shallow, actual string char data (length×2+56 overhead) when deep=true. 36 unit + property tests.

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
