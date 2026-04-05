/**
 * Date offsets — relative date arithmetic akin to `pandas.tseries.offsets`.
 *
 * Provides `DateOffset` (n × calendar unit), `BusinessDay` (skips weekends),
 * and `MonthEnd` / `MonthBegin` offset classes, as well as a composable
 * `addOffset` helper.
 *
 * @example
 * ```ts
 * const d = new Date("2024-01-31T00:00:00.000Z");
 * addOffset(d, new DateOffset(1, "M")).toISOString(); // "2024-02-29T00:00:00.000Z"
 * addOffset(d, new BusinessDay(3)).toISOString();     // "2024-02-05T00:00:00.000Z"
 * ```
 */

// ─── offset units ─────────────────────────────────────────────────────────────

/** Calendar units understood by DateOffset. */
export type OffsetUnit =
  | "D" // calendar day
  | "H" // hour
  | "T" // minute
  | "S" // second
  | "W" // week (7 calendar days)
  | "M" // calendar month
  | "Q" // quarter (3 months)
  | "A" // year
  | "Y"; // year (alias)

// ─── base class ───────────────────────────────────────────────────────────────

/** Base class for all date offsets. */
export abstract class BaseOffset {
  readonly n: number;

  constructor(n = 1) {
    this.n = n;
  }

  /** Apply this offset to a date, returning a new Date. */
  abstract apply(date: Date): Date;

  /** Return an offset in the opposite direction. */
  negate(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this) as object) as object, this, {
      n: -this.n,
    }) as this;
  }

  toString(): string {
    return `${this.constructor.name}(${this.n})`;
  }
}

// ─── DateOffset ───────────────────────────────────────────────────────────────

/**
 * General calendar offset: `n` × `unit`.
 */
export class DateOffset extends BaseOffset {
  readonly unit: OffsetUnit;

  constructor(n = 1, unit: OffsetUnit = "D") {
    super(n);
    this.unit = unit;
  }

  apply(date: Date): Date {
    const d = new Date(date);
    const u = this.unit === "Y" ? "A" : this.unit;
    switch (u) {
      case "D":
        d.setUTCDate(d.getUTCDate() + this.n);
        break;
      case "H":
        d.setTime(d.getTime() + this.n * 3_600_000);
        break;
      case "T":
        d.setTime(d.getTime() + this.n * 60_000);
        break;
      case "S":
        d.setTime(d.getTime() + this.n * 1_000);
        break;
      case "W":
        d.setUTCDate(d.getUTCDate() + this.n * 7);
        break;
      case "M":
        applyMonthOffset(d, this.n);
        break;
      case "Q":
        applyMonthOffset(d, this.n * 3);
        break;
      case "A":
        d.setUTCFullYear(d.getUTCFullYear() + this.n);
        break;
      default: {
        const _x: never = u;
        throw new Error(`Unknown unit: ${_x}`);
      }
    }
    return d;
  }

  override toString(): string {
    return `DateOffset(n=${this.n}, unit="${this.unit}")`;
  }
}

// ─── BusinessDay ──────────────────────────────────────────────────────────────

/**
 * Business-day offset — skips Saturday and Sunday.
 */
export class BusinessDay extends BaseOffset {
  apply(date: Date): Date {
    const d = new Date(date);
    const step = this.n > 0 ? 1 : -1;
    let remaining = Math.abs(this.n);
    while (remaining > 0) {
      d.setUTCDate(d.getUTCDate() + step);
      const dow = d.getUTCDay(); // 0=Sun, 6=Sat
      if (dow !== 0 && dow !== 6) {
        remaining--;
      }
    }
    return d;
  }

  override toString(): string {
    return `BusinessDay(${this.n})`;
  }
}

// ─── MonthEnd / MonthBegin ────────────────────────────────────────────────────

/**
 * Snap to the last calendar day of the month, then advance n more months.
 */
export class MonthEnd extends BaseOffset {
  apply(date: Date): Date {
    const d = new Date(date);
    // Advance n months first, then snap to month-end
    applyMonthOffset(d, this.n);
    snapMonthEnd(d);
    return d;
  }

  override toString(): string {
    return `MonthEnd(${this.n})`;
  }
}

/**
 * Snap to the first calendar day of the month, then advance n months.
 */
export class MonthBegin extends BaseOffset {
  apply(date: Date): Date {
    const d = new Date(date);
    applyMonthOffset(d, this.n);
    d.setUTCDate(1);
    return d;
  }

  override toString(): string {
    return `MonthBegin(${this.n})`;
  }
}

// ─── YearEnd / YearBegin ──────────────────────────────────────────────────────

/**
 * Snap to Dec 31 of the current year, then add n years.
 */
export class YearEnd extends BaseOffset {
  apply(date: Date): Date {
    const d = new Date(date);
    d.setUTCFullYear(d.getUTCFullYear() + this.n);
    d.setUTCMonth(11); // December
    d.setUTCDate(31);
    return d;
  }

  override toString(): string {
    return `YearEnd(${this.n})`;
  }
}

/**
 * Snap to Jan 1 of the current year, then add n years.
 */
export class YearBegin extends BaseOffset {
  apply(date: Date): Date {
    const d = new Date(date);
    d.setUTCFullYear(d.getUTCFullYear() + this.n);
    d.setUTCMonth(0);
    d.setUTCDate(1);
    return d;
  }

  override toString(): string {
    return `YearBegin(${this.n})`;
  }
}

// ─── addOffset ────────────────────────────────────────────────────────────────

/**
 * Apply a date offset to a Date, returning a new Date.
 *
 * @example
 * ```ts
 * addOffset(new Date("2024-01-15"), new MonthEnd(1)); // 2024-01-31
 * addOffset(new Date("2024-01-15"), new BusinessDay(5)); // 2024-01-22
 * ```
 */
export function addOffset(date: Date, offset: BaseOffset): Date {
  return offset.apply(date);
}

/**
 * Generate a sequence of dates by repeatedly applying an offset.
 *
 * @param start   Starting date.
 * @param periods Number of periods to generate.
 * @param offset  Offset applied each step.
 * @returns Array of `periods` dates starting from `start`.
 *
 * @example
 * ```ts
 * dateRange(new Date("2024-01-01"), 4, new MonthBegin(1));
 * // [2024-01-01, 2024-02-01, 2024-03-01, 2024-04-01]
 * ```
 */
export function dateRange(start: Date, periods: number, offset: BaseOffset): Date[] {
  const result: Date[] = [];
  let current = new Date(start);
  for (let i = 0; i < periods; i++) {
    result.push(new Date(current));
    current = offset.apply(current);
  }
  return result;
}

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Add n calendar months, clamping to the last day of the resulting month. */
function applyMonthOffset(d: Date, months: number): void {
  const currentDay = d.getUTCDate();
  const targetMonth = d.getUTCMonth() + months;
  const targetYear = d.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = daysInMonth(targetYear, normalizedMonth);
  // Set all three atomically to avoid intermediate day overflow
  d.setUTCFullYear(targetYear, normalizedMonth, Math.min(currentDay, lastDay));
}

/** Snap a date to the last day of its current month. */
function snapMonthEnd(d: Date): void {
  d.setUTCDate(daysInMonth(d.getUTCFullYear(), d.getUTCMonth()));
}

/** Days in a given (year, 0-based month). */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
