/**
 * date_offset — calendar-aware date arithmetic.
 *
 * Mirrors the following pandas offset classes from `pandas.tseries.offsets`:
 *
 * | Class | pandas equivalent | Description |
 * |---|---|---|
 * | {@link Day} | `Day(n)` | n calendar days |
 * | {@link Hour} | `Hour(n)` | n hours |
 * | {@link Minute} | `Minute(n)` | n minutes |
 * | {@link Second} | `Second(n)` | n seconds |
 * | {@link Milli} | `Milli(n)` | n milliseconds |
 * | {@link Week} | `Week(n, weekday?)` | n weeks, with optional weekday alignment |
 * | {@link MonthEnd} | `MonthEnd(n)` | n month-ends |
 * | {@link MonthBegin} | `MonthBegin(n)` | n month-starts (first of month) |
 * | {@link YearEnd} | `YearEnd(n)` | n year-ends (Dec 31) |
 * | {@link YearBegin} | `YearBegin(n)` | n year-starts (Jan 1) |
 * | {@link BusinessDay} | `BDay(n)` | n business days (Mon–Fri) |
 *
 * All operations work in **UTC** to avoid DST ambiguity.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 0, 15)); // 2024-01-15
 * new MonthEnd(1).apply(d);    // 2024-01-31
 * new MonthEnd(2).apply(d);    // 2024-02-29
 * new YearBegin(1).apply(d);   // 2025-01-01
 * new BusinessDay(3).apply(d); // 2024-01-18
 * ```
 *
 * @module
 */

// ─── constants ────────────────────────────────────────────────────────────────

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

// ─── public interface ─────────────────────────────────────────────────────────

/**
 * Common interface shared by all calendar-aware date offsets.
 *
 * Every offset:
 * - Has a multiplier `n` (positive or negative).
 * - Can `apply` itself to a `Date` to produce a shifted date.
 * - Supports `rollforward` and `rollback` for snapping to the nearest anchor.
 * - Reports whether a date falls `onOffset`.
 */
export interface DateOffset {
  /** Multiplier: number of units per application. */
  readonly n: number;
  /** Human-readable class name, e.g. `"Day"` or `"MonthEnd"`. */
  readonly name: string;
  /**
   * Return a new `Date` that is `n` offset-units ahead of `date`.
   * For anchored offsets (MonthEnd, YearBegin, …) non-anchor dates are
   * first snapped before advancing the remaining steps.
   */
  apply(date: Date): Date;
  /**
   * If `date` falls on the offset anchor, return it unchanged.
   * Otherwise advance to the **next** anchor.
   */
  rollforward(date: Date): Date;
  /**
   * If `date` falls on the offset anchor, return it unchanged.
   * Otherwise retreat to the **previous** anchor.
   */
  rollback(date: Date): Date;
  /** Return `true` if `date` falls exactly on an offset anchor. */
  onOffset(date: Date): boolean;
}

// ─── WeekOptions ──────────────────────────────────────────────────────────────

/** Options accepted by the {@link Week} offset constructor. */
export interface WeekOptions {
  /**
   * Optional weekday alignment following **pandas convention**:
   * `0` = Monday, `1` = Tuesday, …, `6` = Sunday.
   *
   * When set, every anchor date falls on this day of the week.
   * When `null` / `undefined`, every date is "on offset" and `apply` simply
   * adds `n × 7` days.
   */
  readonly weekday?: number | null;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/**
 * Convert a pandas weekday index (0 = Monday) to a JavaScript UTC day index
 * (0 = Sunday, as returned by `Date.prototype.getUTCDay`).
 */
function pdToJsDow(weekday: number): number {
  return weekday === 6 ? 0 : weekday + 1;
}

/** True if `date` falls on the last day of its UTC month. */
function isMonthEnd(date: Date): boolean {
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return date.getUTCDate() === last.getUTCDate();
}

/** True if `date` falls on the first day of its UTC month. */
function isMonthBegin(date: Date): boolean {
  return date.getUTCDate() === 1;
}

/** True if `date` is December 31 (UTC). */
function isYearEnd(date: Date): boolean {
  return date.getUTCMonth() === 11 && date.getUTCDate() === 31;
}

/** True if `date` is January 1 (UTC). */
function isYearBegin(date: Date): boolean {
  return date.getUTCMonth() === 0 && date.getUTCDate() === 1;
}

/** True if `date` is a weekday (Monday–Friday, UTC). */
function isBusinessDay(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow >= 1 && dow <= 5;
}

// ─── apply helpers ────────────────────────────────────────────────────────────

/**
 * Apply month-end semantics for `n` steps.
 *
 * Logic mirrors `pandas.tseries.offsets.MonthEnd(n).apply(date)`:
 * - If not on a month-end and `n > 0`: snap to this month's end (costs 1),
 *   then advance `n-1` more.
 * - If not on a month-end and `n < 0`: snap to prev month's end (costs 1),
 *   then advance `n+1` more.
 * - If on a month-end: advance `n` months directly.
 */
function applyMonthEnd(date: Date, n: number): Date {
  if (n === 0) {
    return new Date(date.getTime());
  }
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  if (isMonthEnd(date)) {
    return new Date(Date.UTC(y, m + n + 1, 0));
  }
  if (n > 0) {
    return new Date(Date.UTC(y, m + n, 0));
  }
  const prev = new Date(Date.UTC(y, m, 0));
  return new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + n + 2, 0));
}

/**
 * Apply month-begin semantics for `n` steps.
 * Mirrors `pandas.tseries.offsets.MonthBegin(n).apply(date)`.
 */
function applyMonthBegin(date: Date, n: number): Date {
  if (n === 0) {
    return new Date(date.getTime());
  }
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  if (isMonthBegin(date) || n > 0) {
    return new Date(Date.UTC(y, m + n, 1));
  }
  return new Date(Date.UTC(y, m + n + 1, 1));
}

/**
 * Apply year-end semantics for `n` steps.
 * Mirrors `pandas.tseries.offsets.YearEnd(n).apply(date)`.
 */
function applyYearEnd(date: Date, n: number): Date {
  if (n === 0) {
    return new Date(date.getTime());
  }
  const y = date.getUTCFullYear();
  if (isYearEnd(date)) {
    return new Date(Date.UTC(y + n, 11, 31));
  }
  if (n > 0) {
    return new Date(Date.UTC(y + n - 1, 11, 31));
  }
  return new Date(Date.UTC(y + n, 11, 31));
}

/**
 * Apply year-begin semantics for `n` steps.
 * Mirrors `pandas.tseries.offsets.YearBegin(n).apply(date)`.
 */
function applyYearBegin(date: Date, n: number): Date {
  if (n === 0) {
    return new Date(date.getTime());
  }
  const y = date.getUTCFullYear();
  if (isYearBegin(date) || n > 0) {
    return new Date(Date.UTC(y + n, 0, 1));
  }
  return new Date(Date.UTC(y + n + 1, 0, 1));
}

/** Roll forward to the current or next business day. */
function rollFwdBiz(date: Date): Date {
  let d = new Date(date.getTime());
  while (!isBusinessDay(d)) {
    d = new Date(d.getTime() + MS_PER_DAY);
  }
  return d;
}

/** Roll backward to the current or previous business day. */
function rollBkBiz(date: Date): Date {
  let d = new Date(date.getTime());
  while (!isBusinessDay(d)) {
    d = new Date(d.getTime() - MS_PER_DAY);
  }
  return d;
}

/**
 * Apply business-day semantics for `n` steps.
 * Mirrors `pandas.tseries.offsets.BDay(n).apply(date)`.
 * Saturdays and Sundays are skipped in both directions.
 */
function applyBday(date: Date, n: number): Date {
  let d = new Date(date.getTime());
  const forward = n >= 0;
  const steps = Math.abs(n);
  for (let i = 0; i < steps; i++) {
    const next = new Date(d.getTime() + (forward ? MS_PER_DAY : -MS_PER_DAY));
    d = forward ? rollFwdBiz(next) : rollBkBiz(next);
  }
  return d;
}

/**
 * Roll forward to the nearest occurrence of `jsDow` (JS UTC day convention).
 * Returns `date` unchanged if it already falls on `jsDow`.
 */
function rollFwdWeekday(date: Date, jsDow: number): Date {
  const daysAhead = (jsDow - date.getUTCDay() + 7) % 7;
  if (daysAhead === 0) {
    return new Date(date.getTime());
  }
  return new Date(date.getTime() + daysAhead * MS_PER_DAY);
}

/**
 * Roll backward to the nearest occurrence of `jsDow` (JS UTC day convention).
 * Returns `date` unchanged if it already falls on `jsDow`.
 */
function rollBkWeekday(date: Date, jsDow: number): Date {
  const daysBack = (date.getUTCDay() - jsDow + 7) % 7;
  if (daysBack === 0) {
    return new Date(date.getTime());
  }
  return new Date(date.getTime() - daysBack * MS_PER_DAY);
}

/**
 * Apply week semantics for `n` steps, with optional weekday alignment.
 * `jsDow` is null for plain (unaligned) weeks.
 */
function applyWeek(date: Date, n: number, jsDow: number | null): Date {
  if (n === 0) {
    return new Date(date.getTime());
  }
  if (jsDow === null) {
    return new Date(date.getTime() + n * MS_PER_WEEK);
  }
  const onTarget = date.getUTCDay() === jsDow;
  if (n > 0) {
    if (onTarget) {
      return new Date(date.getTime() + n * MS_PER_WEEK);
    }
    const rolled = rollFwdWeekday(date, jsDow);
    return new Date(rolled.getTime() + (n - 1) * MS_PER_WEEK);
  }
  if (onTarget) {
    return new Date(date.getTime() + n * MS_PER_WEEK);
  }
  const rolled = rollBkWeekday(date, jsDow);
  return new Date(rolled.getTime() + (n + 1) * MS_PER_WEEK);
}

// ─── classes ──────────────────────────────────────────────────────────────────

/**
 * n calendar days.
 *
 * Mirrors `pandas.tseries.offsets.Day`.
 * Every date is "on offset" — `rollforward` and `rollback` are no-ops.
 *
 * @example
 * ```ts
 * new Day(3).apply(new Date(Date.UTC(2024, 0, 1))); // 2024-01-04
 * ```
 */
export class Day implements DateOffset {
  readonly name = "Day";

  constructor(readonly n = 1) {}

  /** Convenience factory: `Day.of(3)` equivalent to `new Day(3)`. */
  static of(n = 1): Day {
    return new Day(n);
  }

  apply(date: Date): Date {
    return new Date(date.getTime() + this.n * MS_PER_DAY);
  }

  rollforward(date: Date): Date {
    return new Date(date.getTime());
  }

  rollback(date: Date): Date {
    return new Date(date.getTime());
  }

  onOffset(_date: Date): boolean {
    return true;
  }

  /** Return a new `Day` with multiplier scaled by `factor`. */
  multiply(factor: number): Day {
    return new Day(this.n * factor);
  }

  /** Return a new `Day` with negated multiplier. */
  negate(): Day {
    return new Day(-this.n);
  }
}

/**
 * n hours.
 *
 * Mirrors `pandas.tseries.offsets.Hour`.
 * Every date is "on offset".
 */
export class Hour implements DateOffset {
  readonly name = "Hour";

  constructor(readonly n = 1) {}

  static of(n = 1): Hour {
    return new Hour(n);
  }

  apply(date: Date): Date {
    return new Date(date.getTime() + this.n * MS_PER_HOUR);
  }

  rollforward(date: Date): Date {
    return new Date(date.getTime());
  }

  rollback(date: Date): Date {
    return new Date(date.getTime());
  }

  onOffset(_date: Date): boolean {
    return true;
  }

  multiply(factor: number): Hour {
    return new Hour(this.n * factor);
  }

  negate(): Hour {
    return new Hour(-this.n);
  }
}

/**
 * n minutes.
 *
 * Mirrors `pandas.tseries.offsets.Minute`.
 */
export class Minute implements DateOffset {
  readonly name = "Minute";

  constructor(readonly n = 1) {}

  static of(n = 1): Minute {
    return new Minute(n);
  }

  apply(date: Date): Date {
    return new Date(date.getTime() + this.n * MS_PER_MINUTE);
  }

  rollforward(date: Date): Date {
    return new Date(date.getTime());
  }

  rollback(date: Date): Date {
    return new Date(date.getTime());
  }

  onOffset(_date: Date): boolean {
    return true;
  }

  multiply(factor: number): Minute {
    return new Minute(this.n * factor);
  }

  negate(): Minute {
    return new Minute(-this.n);
  }
}

/**
 * n seconds.
 *
 * Mirrors `pandas.tseries.offsets.Second`.
 */
export class Second implements DateOffset {
  readonly name = "Second";

  constructor(readonly n = 1) {}

  static of(n = 1): Second {
    return new Second(n);
  }

  apply(date: Date): Date {
    return new Date(date.getTime() + this.n * MS_PER_SECOND);
  }

  rollforward(date: Date): Date {
    return new Date(date.getTime());
  }

  rollback(date: Date): Date {
    return new Date(date.getTime());
  }

  onOffset(_date: Date): boolean {
    return true;
  }

  multiply(factor: number): Second {
    return new Second(this.n * factor);
  }

  negate(): Second {
    return new Second(-this.n);
  }
}

/**
 * n milliseconds.
 *
 * Mirrors `pandas.tseries.offsets.Milli`.
 */
export class Milli implements DateOffset {
  readonly name = "Milli";

  constructor(readonly n = 1) {}

  static of(n = 1): Milli {
    return new Milli(n);
  }

  apply(date: Date): Date {
    return new Date(date.getTime() + this.n);
  }

  rollforward(date: Date): Date {
    return new Date(date.getTime());
  }

  rollback(date: Date): Date {
    return new Date(date.getTime());
  }

  onOffset(_date: Date): boolean {
    return true;
  }

  multiply(factor: number): Milli {
    return new Milli(this.n * factor);
  }

  negate(): Milli {
    return new Milli(-this.n);
  }
}

/**
 * n weeks, with optional weekday alignment.
 *
 * Mirrors `pandas.tseries.offsets.Week`.
 *
 * When `weekday` is specified (pandas convention: 0 = Monday, …, 6 = Sunday),
 * every anchor date falls on that day of the week.
 * Without `weekday`, every date is "on offset" and `apply` adds `n × 7` days.
 *
 * @example
 * ```ts
 * // Plain week
 * new Week(2).apply(new Date(Date.UTC(2024, 0, 1)));   // 2024-01-15
 *
 * // Weekday-aligned (anchor = Monday)
 * const wk = new Week(1, { weekday: 0 }); // 0 = Monday
 * wk.apply(new Date(Date.UTC(2024, 0, 15))); // 2024-01-22 (next Mon)
 * wk.apply(new Date(Date.UTC(2024, 0, 17))); // 2024-01-22 (next Mon from Wed)
 * ```
 */
export class Week implements DateOffset {
  readonly name = "Week";

  /**
   * Weekday anchor (pandas convention: 0 = Monday, …, 6 = Sunday).
   * `null` means no alignment.
   */
  readonly weekday: number | null;

  constructor(
    readonly n = 1,
    options: WeekOptions = {},
  ) {
    this.weekday = options.weekday ?? null;
  }

  static of(n = 1, options?: WeekOptions): Week {
    return new Week(n, options);
  }

  apply(date: Date): Date {
    const jsDow = this.weekday === null ? null : pdToJsDow(this.weekday);
    return applyWeek(date, this.n, jsDow);
  }

  rollforward(date: Date): Date {
    if (this.weekday === null) {
      return new Date(date.getTime());
    }
    return rollFwdWeekday(date, pdToJsDow(this.weekday));
  }

  rollback(date: Date): Date {
    if (this.weekday === null) {
      return new Date(date.getTime());
    }
    return rollBkWeekday(date, pdToJsDow(this.weekday));
  }

  onOffset(date: Date): boolean {
    if (this.weekday === null) {
      return true;
    }
    return date.getUTCDay() === pdToJsDow(this.weekday);
  }

  multiply(factor: number): Week {
    return new Week(this.n * factor, { weekday: this.weekday });
  }

  negate(): Week {
    return new Week(-this.n, { weekday: this.weekday });
  }
}

/**
 * n month-ends.
 *
 * Mirrors `pandas.tseries.offsets.MonthEnd`.
 * Anchor dates are the last calendar day of each month.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 0, 15)); // 2024-01-15
 * new MonthEnd(1).apply(d);  // 2024-01-31
 * new MonthEnd(2).apply(d);  // 2024-02-29
 * new MonthEnd(-1).apply(d); // 2023-12-31
 *
 * // Rolling
 * new MonthEnd(0).rollforward(d); // 2024-01-31
 * new MonthEnd(0).rollback(d);    // 2023-12-31
 * ```
 */
export class MonthEnd implements DateOffset {
  readonly name = "MonthEnd";

  constructor(readonly n = 1) {}

  static of(n = 1): MonthEnd {
    return new MonthEnd(n);
  }

  apply(date: Date): Date {
    return applyMonthEnd(date, this.n);
  }

  rollforward(date: Date): Date {
    if (isMonthEnd(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    return new Date(Date.UTC(y, m + 1, 0));
  }

  rollback(date: Date): Date {
    if (isMonthEnd(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    return new Date(Date.UTC(y, m, 0));
  }

  onOffset(date: Date): boolean {
    return isMonthEnd(date);
  }

  multiply(factor: number): MonthEnd {
    return new MonthEnd(this.n * factor);
  }

  negate(): MonthEnd {
    return new MonthEnd(-this.n);
  }
}

/**
 * n month-starts.
 *
 * Mirrors `pandas.tseries.offsets.MonthBegin`.
 * Anchor dates are the first calendar day of each month.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 0, 15)); // 2024-01-15
 * new MonthBegin(1).apply(d);   // 2024-02-01
 * new MonthBegin(-1).apply(d);  // 2024-01-01
 *
 * // Rolling
 * new MonthBegin(0).rollforward(d); // 2024-02-01
 * new MonthBegin(0).rollback(d);    // 2024-01-01
 * ```
 */
export class MonthBegin implements DateOffset {
  readonly name = "MonthBegin";

  constructor(readonly n = 1) {}

  static of(n = 1): MonthBegin {
    return new MonthBegin(n);
  }

  apply(date: Date): Date {
    return applyMonthBegin(date, this.n);
  }

  rollforward(date: Date): Date {
    if (isMonthBegin(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    return new Date(Date.UTC(y, m + 1, 1));
  }

  rollback(date: Date): Date {
    if (isMonthBegin(date)) {
      return new Date(date.getTime());
    }
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    return new Date(Date.UTC(y, m, 1));
  }

  onOffset(date: Date): boolean {
    return isMonthBegin(date);
  }

  multiply(factor: number): MonthBegin {
    return new MonthBegin(this.n * factor);
  }

  negate(): MonthBegin {
    return new MonthBegin(-this.n);
  }
}

/**
 * n year-ends (December 31).
 *
 * Mirrors `pandas.tseries.offsets.YearEnd`.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 0, 15)); // 2024-01-15
 * new YearEnd(1).apply(d);   // 2024-12-31
 * new YearEnd(2).apply(d);   // 2025-12-31
 * new YearEnd(-1).apply(d);  // 2023-12-31
 * ```
 */
export class YearEnd implements DateOffset {
  readonly name = "YearEnd";

  constructor(readonly n = 1) {}

  static of(n = 1): YearEnd {
    return new YearEnd(n);
  }

  apply(date: Date): Date {
    return applyYearEnd(date, this.n);
  }

  rollforward(date: Date): Date {
    if (isYearEnd(date)) {
      return new Date(date.getTime());
    }
    return new Date(Date.UTC(date.getUTCFullYear(), 11, 31));
  }

  rollback(date: Date): Date {
    if (isYearEnd(date)) {
      return new Date(date.getTime());
    }
    return new Date(Date.UTC(date.getUTCFullYear() - 1, 11, 31));
  }

  onOffset(date: Date): boolean {
    return isYearEnd(date);
  }

  multiply(factor: number): YearEnd {
    return new YearEnd(this.n * factor);
  }

  negate(): YearEnd {
    return new YearEnd(-this.n);
  }
}

/**
 * n year-starts (January 1).
 *
 * Mirrors `pandas.tseries.offsets.YearBegin`.
 *
 * @example
 * ```ts
 * const d = new Date(Date.UTC(2024, 6, 4)); // 2024-07-04
 * new YearBegin(1).apply(d);   // 2025-01-01
 * new YearBegin(-1).apply(d);  // 2024-01-01
 * ```
 */
export class YearBegin implements DateOffset {
  readonly name = "YearBegin";

  constructor(readonly n = 1) {}

  static of(n = 1): YearBegin {
    return new YearBegin(n);
  }

  apply(date: Date): Date {
    return applyYearBegin(date, this.n);
  }

  rollforward(date: Date): Date {
    if (isYearBegin(date)) {
      return new Date(date.getTime());
    }
    return new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
  }

  rollback(date: Date): Date {
    if (isYearBegin(date)) {
      return new Date(date.getTime());
    }
    return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  }

  onOffset(date: Date): boolean {
    return isYearBegin(date);
  }

  multiply(factor: number): YearBegin {
    return new YearBegin(this.n * factor);
  }

  negate(): YearBegin {
    return new YearBegin(-this.n);
  }
}

/**
 * n business days (Monday–Friday).
 *
 * Mirrors `pandas.tseries.offsets.BDay` / `BusinessDay`.
 * Weekends are skipped — each step advances or retreats by exactly one
 * weekday.
 *
 * @example
 * ```ts
 * const fri = new Date(Date.UTC(2024, 0, 12)); // 2024-01-12 (Friday)
 * new BusinessDay(1).apply(fri);  // 2024-01-15 (Monday)
 * new BusinessDay(3).apply(fri);  // 2024-01-17 (Wednesday)
 * new BusinessDay(-1).apply(fri); // 2024-01-11 (Thursday)
 * ```
 */
export class BusinessDay implements DateOffset {
  readonly name = "BusinessDay";

  constructor(readonly n = 1) {}

  static of(n = 1): BusinessDay {
    return new BusinessDay(n);
  }

  apply(date: Date): Date {
    return applyBday(date, this.n);
  }

  rollforward(date: Date): Date {
    return rollFwdBiz(date);
  }

  rollback(date: Date): Date {
    return rollBkBiz(date);
  }

  onOffset(date: Date): boolean {
    return isBusinessDay(date);
  }

  multiply(factor: number): BusinessDay {
    return new BusinessDay(this.n * factor);
  }

  negate(): BusinessDay {
    return new BusinessDay(-this.n);
  }
}
