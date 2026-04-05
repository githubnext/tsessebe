/**
 * DatetimeIndex and DatetimeTZDtype — datetime index with optional timezone support.
 *
 * Mirrors `pandas.DatetimeIndex` and `pandas.DatetimeTZDtype`:
 * stores an ordered sequence of UTC timestamps (as JS `Date` objects),
 * with an optional IANA timezone annotation.  When a timezone is set,
 * component properties (year, month, day, hour, …) are evaluated in
 * *local* time rather than UTC.
 *
 * `date_range()` generates evenly-spaced datetime sequences, mirroring
 * `pd.date_range`.
 *
 * @example
 * ```ts
 * const idx = DatetimeIndex.fromStrings(["2021-01-01", "2021-06-15", "2021-12-31"]);
 * idx.year;        // [2021, 2021, 2021]
 * idx.month;       // [1, 6, 12]
 * idx.dayofweek;   // [4, 1, 4]   (Friday, Tuesday, Friday)
 *
 * const rng = date_range("2024-01-01", { periods: 5, freq: "D" });
 * rng.size;        // 5
 * rng.strftime("%Y-%m-%d"); // ["2024-01-01", ..., "2024-01-05"]
 *
 * const nyIdx = idx.tz_localize("America/New_York");
 * nyIdx.tz;        // "America/New_York"
 * ```
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** Input types accepted when constructing a DatetimeIndex. */
export type DateLike = Date | string | number;

/** Options for `date_range`. */
export interface DateRangeOptions {
  /** End of the range (inclusive). Either `end` or `periods` is required. */
  readonly end?: string | Date | null;
  /** Number of periods to generate. Either `end` or `periods` is required. */
  readonly periods?: number | null;
  /** Frequency string (e.g. "D", "H", "MS"). Defaults to "D". */
  readonly freq?: string | null;
  /** IANA timezone string to assign (e.g. "America/New_York"). */
  readonly tz?: string | null;
  /** Optional name for the index. */
  readonly name?: string | null;
}

/** Options for the `DatetimeIndex` constructor. */
export interface DatetimeIndexOptions {
  /** IANA timezone string (e.g. "UTC", "Europe/Berlin"). null = tz-naive. */
  readonly tz?: string | null;
  /** Optional name for the index axis. */
  readonly name?: string | null;
}

/** Decomposed date/time parts in a given timezone. */
interface LocalParts {
  readonly year: number;
  readonly month: number; // 1-based
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

// ─── top-level constants ──────────────────────────────────────────────────────

/** Parses an optional numeric multiplier and a unit string from a frequency token. */
const FREQ_MULT_RE = /^(\d+)?([A-Za-z]+)$/;

/** Abbreviated month names. */
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Full month names. */
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Abbreviated weekday names (0=Monday). */
const WEEKDAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Full weekday names (0=Monday). */
const WEEKDAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Fixed-frequency durations in milliseconds. */
const FIXED_FREQ_MS: Readonly<Record<string, number>> = {
  ns: 0.001,
  us: 0.001,
  ms: 1,
  L: 1,
  S: 1000,
  s: 1000,
  T: 60_000,
  min: 60_000,
  H: 3_600_000,
  h: 3_600_000,
  D: 86_400_000,
  W: 604_800_000,
};

/** Canonical unit aliases (maps legacy/alternative names to canonical form). */
const UNIT_ALIAS: Readonly<Record<string, string>> = {
  s: "S",
  h: "H",
  min: "T",
  A: "YE",
  Y: "YE",
  AS: "YS",
  Q: "QE",
  M: "ME",
};

// ─── DatetimeTZDtype ─────────────────────────────────────────────────────────

/**
 * Dtype descriptor for timezone-aware datetimes, mirroring
 * `pandas.DatetimeTZDtype`.
 *
 * @example
 * ```ts
 * const dtype = new DatetimeTZDtype("America/New_York");
 * dtype.toString(); // "datetime64[ns, America/New_York]"
 * dtype.tz;         // "America/New_York"
 * ```
 */
export class DatetimeTZDtype {
  /** IANA timezone string. */
  readonly tz: string;

  /** Nominal kind — always `"datetime"`. */
  readonly kind = "datetime" as const;

  constructor(tz: string) {
    this.tz = tz;
  }

  toString(): string {
    return `datetime64[ns, ${this.tz}]`;
  }

  equals(other: DatetimeTZDtype): boolean {
    return this.tz === other.tz;
  }
}

// ─── coercion helpers ─────────────────────────────────────────────────────────

/** Coerce a DateLike value to a Date, or return null on failure. */
function coerceDate(v: DateLike | null | undefined): Date | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }
  if (typeof v === "number") {
    if (!Number.isFinite(v)) {
      return null;
    }
    return new Date(v);
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Coerce an array of DateLike inputs to Dates, replacing invalid values with epoch. */
function coerceDates(data: readonly (DateLike | null | undefined)[]): Date[] {
  return data.map((v) => coerceDate(v) ?? new Date(0));
}

// ─── timezone component helpers ───────────────────────────────────────────────

/** Intl formatter options for extracting local date-time parts. */
const intlParts: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

/** Extract local date/time components for a given IANA timezone. */
function getLocalParts(d: Date, tz: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", { ...intlParts, timeZone: tz }).formatToParts(d);
  const acc = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  applyParts(parts, acc);
  return acc;
}

/** Mutate `acc` by reading Intl.DateTimeFormatPart values into it. */
function applyParts(
  parts: Intl.DateTimeFormatPart[],
  acc: { year: number; month: number; day: number; hour: number; minute: number; second: number },
): void {
  for (const p of parts) {
    applyPart(p, acc);
  }
}

/** Apply a single format part to the accumulator. */
function applyPart(
  p: Intl.DateTimeFormatPart,
  acc: { year: number; month: number; day: number; hour: number; minute: number; second: number },
): void {
  const val = Number.parseInt(p.value, 10);
  if (p.type === "year") {
    acc.year = val;
  } else if (p.type === "month") {
    acc.month = val;
  } else if (p.type === "day") {
    acc.day = val;
  } else if (p.type === "hour") {
    acc.hour = val === 24 ? 0 : val;
  } else if (p.type === "minute") {
    acc.minute = val;
  } else if (p.type === "second") {
    acc.second = val;
  }
}

/** Compute the UTC offset (in ms) of a timezone at a given moment. */
function tzOffsetMs(d: Date, tz: string): number {
  const lp = getLocalParts(d, tz);
  const localMs = Date.UTC(lp.year, lp.month - 1, lp.day, lp.hour, lp.minute, lp.second);
  return localMs - d.getTime();
}

/** Extract a single component from a Date using UTC or a named timezone. */
function component(
  d: Date,
  tz: string | null,
  field: "year" | "month" | "day" | "hour" | "minute" | "second",
): number {
  if (tz === null) {
    switch (field) {
      case "year":
        return d.getUTCFullYear();
      case "month":
        return d.getUTCMonth() + 1;
      case "day":
        return d.getUTCDate();
      case "hour":
        return d.getUTCHours();
      case "minute":
        return d.getUTCMinutes();
      case "second":
        return d.getUTCSeconds();
      default:
        return 0;
    }
  }
  const lp = getLocalParts(d, tz);
  return lp[field] as number;
}

// ─── calendar helpers ─────────────────────────────────────────────────────────

/** Return true if year is a leap year. */
function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days in month `m` (1-based) of year `y`. */
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Day of year (1-based) for a UTC date. */
function dayOfYear(d: Date, tz: string | null): number {
  const y = component(d, tz, "year");
  const m = component(d, tz, "month");
  const day = component(d, tz, "day");
  let doy = day;
  for (let i = 1; i < m; i++) {
    doy += daysInMonth(y, i);
  }
  return doy;
}

/** Day of week: 0=Monday … 6=Sunday. */
function dayOfWeek(d: Date, tz: string | null): number {
  if (tz === null) {
    return (d.getUTCDay() + 6) % 7;
  }
  const lp = getLocalParts(d, tz);
  const tmp = new Date(Date.UTC(lp.year, lp.month - 1, lp.day));
  return (tmp.getUTCDay() + 6) % 7;
}

/** ISO week number. */
function isoWeek(d: Date, tz: string | null): number {
  const y = component(d, tz, "year");
  const m = component(d, tz, "month");
  const day = component(d, tz, "day");
  const dt = new Date(Date.UTC(y, m - 1, day));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil(((dt.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Quarter 1–4. */
function quarter(d: Date, tz: string | null): number {
  return Math.floor((component(d, tz, "month") - 1) / 3) + 1;
}

// ─── month-start / month-end helpers ─────────────────────────────────────────

/** True if day is the first day of its month. */
function isMonthStart(d: Date, tz: string | null): boolean {
  return component(d, tz, "day") === 1;
}

/** True if day is the last day of its month. */
function isMonthEnd(d: Date, tz: string | null): boolean {
  const y = component(d, tz, "year");
  const m = component(d, tz, "month");
  return component(d, tz, "day") === daysInMonth(y, m);
}

/** True if the date is the first day of the year. */
function isYearStart(d: Date, tz: string | null): boolean {
  return component(d, tz, "month") === 1 && component(d, tz, "day") === 1;
}

/** True if the date is the last day of the year. */
function isYearEnd(d: Date, tz: string | null): boolean {
  return component(d, tz, "month") === 12 && component(d, tz, "day") === 31;
}

/** True if the date is the first day of its quarter. */
function isQuarterStart(d: Date, tz: string | null): boolean {
  const m = component(d, tz, "month");
  return component(d, tz, "day") === 1 && (m === 1 || m === 4 || m === 7 || m === 10);
}

/** True if the date is the last day of its quarter. */
function isQuarterEnd(d: Date, tz: string | null): boolean {
  const y = component(d, tz, "year");
  const m = component(d, tz, "month");
  const day = component(d, tz, "day");
  if (m === 3 || m === 6 || m === 9 || m === 12) {
    return day === daysInMonth(y, m);
  }
  return false;
}

// ─── frequency helpers ────────────────────────────────────────────────────────

/** Parse a frequency string like "2H", "MS", "D" into {mult, unit}. */
function parseFreq(freq: string): { mult: number; unit: string } {
  const m = FREQ_MULT_RE.exec(freq);
  if (m === null) {
    throw new Error(`Invalid frequency: ${freq}`);
  }
  const mult = m[1] !== undefined ? Number.parseInt(m[1], 10) : 1;
  const rawUnit = m[2] ?? "";
  const unit = UNIT_ALIAS[rawUnit] ?? rawUnit;
  return { mult, unit };
}

/** True if freq is a fixed-duration (non-calendar) frequency. */
function isFixedFreq(unit: string): boolean {
  return Object.prototype.hasOwnProperty.call(FIXED_FREQ_MS, unit);
}

/** Add `n` months to a Date (UTC), clamping to month-end when needed. */
function addMonths(d: Date, n: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const newM = m + n;
  const newY = y + Math.floor(newM / 12);
  const normM = ((newM % 12) + 12) % 12;
  const maxDay = daysInMonth(newY, normM + 1);
  return new Date(
    Date.UTC(
      newY,
      normM,
      Math.min(day, maxDay),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  );
}

/** Return the first day of the month for UTC date `d`. */
function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Return the last day of the month for UTC date `d`. */
function monthEnd(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

/** Return the first day of the quarter for UTC date `d`. */
function quarterStart(d: Date): Date {
  const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(d.getUTCFullYear(), qStartMonth, 1));
}

/** Return the last day of the quarter for UTC date `d`. */
function quarterEnd(d: Date): Date {
  const qEndMonth = Math.floor(d.getUTCMonth() / 3) * 3 + 2;
  const y = d.getUTCFullYear();
  return new Date(Date.UTC(y, qEndMonth + 1, 0));
}

/** Return the first day of the year. */
function yearStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

/** Return the last day of the year. */
function yearEnd(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 11, 31));
}

/** Advance a date by one calendar step for a given calendar unit. */
function nextCalendarStep(d: Date, unit: string, mult: number): Date {
  switch (unit) {
    case "MS":
      return monthStart(addMonths(d, mult));
    case "ME":
      return monthEnd(addMonths(monthStart(d), mult));
    case "QS":
      return quarterStart(addMonths(d, mult * 3));
    case "QE":
      return quarterEnd(addMonths(quarterStart(d), mult * 3));
    case "YS":
      return yearStart(addMonths(d, mult * 12));
    case "YE":
      return yearEnd(addMonths(yearStart(d), mult * 12));
    default:
      throw new Error(`Unknown calendar freq unit: ${unit}`);
  }
}

// ─── date_range builder ───────────────────────────────────────────────────────

/** Build a range using fixed-ms frequency. */
function buildFixedRange(start: Date, freqMs: number, count: number): Date[] {
  const result: Date[] = [];
  for (let i = 0; i < count; i++) {
    result.push(new Date(start.getTime() + freqMs * i));
  }
  return result;
}

/** Build a range using calendar (month/quarter/year) frequency. */
function buildCalendarRange(start: Date, unit: string, mult: number, count: number): Date[] {
  const result: Date[] = [start];
  let cur = start;
  for (let i = 1; i < count; i++) {
    cur = nextCalendarStep(cur, unit, mult);
    result.push(cur);
  }
  return result;
}

/** Resolve count from (start, end, periods) triple for fixed frequencies. */
function resolveCountFixed(
  start: Date,
  end: Date | null,
  periods: number | null,
  freqMs: number,
): number {
  if (periods !== null) {
    return periods;
  }
  if (end !== null) {
    return Math.floor((end.getTime() - start.getTime()) / freqMs) + 1;
  }
  return 1;
}

/** Resolve count from (start, end, periods) triple for calendar frequencies. */
function resolveCountCalendar(
  start: Date,
  end: Date | null,
  periods: number | null,
  unit: string,
  mult: number,
): number {
  if (periods !== null) {
    return periods;
  }
  if (end !== null) {
    let count = 0;
    let cur = start;
    while (cur.getTime() <= end.getTime()) {
      count++;
      cur = nextCalendarStep(cur, unit, mult);
    }
    return count;
  }
  return 1;
}

// ─── strftime helpers ─────────────────────────────────────────────────────────

/** Left-pad `n` with zeros to `width`. */
function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/** Format a UTC offset in ±HHMM notation. */
function formatOffset(offsetMs: number): string {
  const sign = offsetMs >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMs);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  return `${sign}${pad(h, 2)}${pad(m, 2)}`;
}

/** Apply a single strftime directive to a Date in the given timezone. */
function applyDirective(d: Date, tz: string | null, ch: string): string {
  const y = component(d, tz, "year");
  const mo = component(d, tz, "month");
  const day = component(d, tz, "day");
  const h = component(d, tz, "hour");
  const mi = component(d, tz, "minute");
  const s = component(d, tz, "second");
  const dow = dayOfWeek(d, tz);
  switch (ch) {
    case "Y":
      return pad(y, 4);
    case "y":
      return pad(y % 100, 2);
    case "m":
      return pad(mo, 2);
    case "d":
      return pad(day, 2);
    case "H":
      return pad(h, 2);
    case "I":
      return pad(h % 12 || 12, 2);
    case "M":
      return pad(mi, 2);
    case "S":
      return pad(s, 2);
    case "f":
      return pad(d.getUTCMilliseconds() * 1000, 6);
    case "p":
      return h < 12 ? "AM" : "PM";
    case "A":
      return WEEKDAY_FULL[dow] ?? "";
    case "a":
      return WEEKDAY_ABBR[dow] ?? "";
    case "B":
      return MONTH_FULL[mo - 1] ?? "";
    case "b":
    case "h":
      return MONTH_ABBR[mo - 1] ?? "";
    case "j":
      return pad(dayOfYear(d, tz), 3);
    case "w":
      return String((dow + 1) % 7);
    case "Z":
      return tz ?? "UTC";
    case "z":
      return tz !== null ? formatOffset(tzOffsetMs(d, tz)) : "+0000";
    case "%":
      return "%";
    default:
      return `%${ch}`;
  }
}

/** Format a single Date using a strftime-style format string. */
function formatDate(d: Date, fmt: string, tz: string | null): string {
  let out = "";
  let i = 0;
  while (i < fmt.length) {
    const ch = fmt[i];
    if (ch === "%" && i + 1 < fmt.length) {
      const next = fmt[i + 1] ?? "";
      out += applyDirective(d, tz, next);
      i += 2;
    } else {
      out += ch ?? "";
      i += 1;
    }
  }
  return out;
}

// ─── floor/ceil/round helpers ─────────────────────────────────────────────────

/** Floor a Date to the nearest multiple of `freqMs`. */
function floorDate(d: Date, freqMs: number): Date {
  return new Date(Math.floor(d.getTime() / freqMs) * freqMs);
}

/** Ceil a Date to the nearest multiple of `freqMs`. */
function ceilDate(d: Date, freqMs: number): Date {
  const t = d.getTime();
  const rem = t % freqMs;
  return rem === 0 ? new Date(t) : new Date(t + (freqMs - rem));
}

/** Round a Date to the nearest multiple of `freqMs`. */
function roundDate(d: Date, freqMs: number): Date {
  const t = d.getTime();
  return new Date(Math.round(t / freqMs) * freqMs);
}

// ─── DatetimeIndex ────────────────────────────────────────────────────────────

/**
 * An immutable, ordered sequence of datetime labels.
 *
 * Mirrors `pandas.DatetimeIndex`: stores `Date` objects (UTC-based) with an
 * optional IANA timezone. When a timezone is set, component properties such
 * as `year`, `month`, `hour` are evaluated in local time.
 *
 * @example
 * ```ts
 * const rng = date_range("2024-03-01", { periods: 3, freq: "MS" });
 * rng.month;  // [3, 4, 5]
 *
 * const nyRng = rng.tz_localize("America/New_York");
 * nyRng.tz;   // "America/New_York"
 * ```
 */
export class DatetimeIndex {
  /** Internal storage — frozen array of UTC Date objects. */
  protected readonly _values: readonly Date[];

  /** Optional human-readable label for this axis. */
  readonly name: string | null;

  /** IANA timezone string, or null for timezone-naive. */
  readonly tz: string | null;

  // ─── construction ──────────────────────────────────────────────

  constructor(data: readonly (DateLike | null | undefined)[], options: DatetimeIndexOptions = {}) {
    this._values = Object.freeze(coerceDates(data));
    this.name = options.name ?? null;
    this.tz = options.tz ?? null;
  }

  /** Create from an array of ISO strings. */
  static fromStrings(
    data: readonly (string | null)[],
    options?: DatetimeIndexOptions,
  ): DatetimeIndex {
    return new DatetimeIndex(data, options);
  }

  /** Create from an array of millisecond timestamps. */
  static fromMs(data: readonly (number | null)[], options?: DatetimeIndexOptions): DatetimeIndex {
    return new DatetimeIndex(data, options);
  }

  // ─── core Index-like properties ────────────────────────────────

  /** Number of elements. */
  get size(): number {
    return this._values.length;
  }

  /** Shape tuple (always 1-D). */
  get shape(): [number] {
    return [this._values.length];
  }

  /** Number of dimensions (always 1). */
  get ndim(): 1 {
    return 1;
  }

  /** True when the index has zero elements. */
  get empty(): boolean {
    return this._values.length === 0;
  }

  /** Snapshot of the underlying values as a plain array. */
  get values(): readonly Date[] {
    return this._values;
  }

  /** Return the Date at position `i`. */
  at(i: number): Date | null {
    return this._values[i] ?? null;
  }

  /** True when values are weakly ascending. */
  get isMonotonicIncreasing(): boolean {
    for (let i = 1; i < this._values.length; i++) {
      const prev = this._values[i - 1];
      const curr = this._values[i];
      if (prev === undefined || curr === undefined) {
        return false;
      }
      if (prev.getTime() > curr.getTime()) {
        return false;
      }
    }
    return true;
  }

  /** True when values are weakly descending. */
  get isMonotonicDecreasing(): boolean {
    for (let i = 1; i < this._values.length; i++) {
      const prev = this._values[i - 1];
      const curr = this._values[i];
      if (prev === undefined || curr === undefined) {
        return false;
      }
      if (prev.getTime() < curr.getTime()) {
        return false;
      }
    }
    return true;
  }

  /** True when every label appears exactly once. */
  get isUnique(): boolean {
    const seen = new Set<number>();
    for (const d of this._values) {
      const t = d.getTime();
      if (seen.has(t)) {
        return false;
      }
      seen.add(t);
    }
    return true;
  }

  // ─── dtype ─────────────────────────────────────────────────────

  /** Returns `DatetimeTZDtype` when tz-aware, or `"datetime64[ns]"` when naive. */
  get dtype(): DatetimeTZDtype | string {
    if (this.tz !== null) {
      return new DatetimeTZDtype(this.tz);
    }
    return "datetime64[ns]";
  }

  // ─── component arrays ──────────────────────────────────────────

  /** Year component. */
  get year(): number[] {
    return this._values.map((d) => component(d, this.tz, "year"));
  }

  /** Month component (1–12). */
  get month(): number[] {
    return this._values.map((d) => component(d, this.tz, "month"));
  }

  /** Day of month (1–31). */
  get day(): number[] {
    return this._values.map((d) => component(d, this.tz, "day"));
  }

  /** Hour component (0–23). */
  get hour(): number[] {
    return this._values.map((d) => component(d, this.tz, "hour"));
  }

  /** Minute component (0–59). */
  get minute(): number[] {
    return this._values.map((d) => component(d, this.tz, "minute"));
  }

  /** Second component (0–59). */
  get second(): number[] {
    return this._values.map((d) => component(d, this.tz, "second"));
  }

  /** Millisecond component (0–999). */
  get millisecond(): number[] {
    return this._values.map((d) => d.getUTCMilliseconds());
  }

  /** Day of week (0=Monday … 6=Sunday), matching pandas convention. */
  get dayofweek(): number[] {
    return this._values.map((d) => dayOfWeek(d, this.tz));
  }

  /** Alias for `dayofweek`. */
  get day_of_week(): number[] {
    return this.dayofweek;
  }

  /** Day of year (1–366). */
  get dayofyear(): number[] {
    return this._values.map((d) => dayOfYear(d, this.tz));
  }

  /** Alias for `dayofyear`. */
  get day_of_year(): number[] {
    return this.dayofyear;
  }

  /** ISO week number (1–53). */
  get weekofyear(): number[] {
    return this._values.map((d) => isoWeek(d, this.tz));
  }

  /** Alias for `weekofyear`. */
  get week(): number[] {
    return this.weekofyear;
  }

  /** Quarter (1–4). */
  get quarter(): number[] {
    return this._values.map((d) => quarter(d, this.tz));
  }

  /** True when each date is a leap year. */
  get is_leap_year(): boolean[] {
    return this._values.map((d) => isLeap(component(d, this.tz, "year")));
  }

  /** True when each date is the first day of its month. */
  get is_month_start(): boolean[] {
    return this._values.map((d) => isMonthStart(d, this.tz));
  }

  /** True when each date is the last day of its month. */
  get is_month_end(): boolean[] {
    return this._values.map((d) => isMonthEnd(d, this.tz));
  }

  /** True when each date is the first day of its quarter. */
  get is_quarter_start(): boolean[] {
    return this._values.map((d) => isQuarterStart(d, this.tz));
  }

  /** True when each date is the last day of its quarter. */
  get is_quarter_end(): boolean[] {
    return this._values.map((d) => isQuarterEnd(d, this.tz));
  }

  /** True when each date is the first day of its year. */
  get is_year_start(): boolean[] {
    return this._values.map((d) => isYearStart(d, this.tz));
  }

  /** True when each date is the last day of its year. */
  get is_year_end(): boolean[] {
    return this._values.map((d) => isYearEnd(d, this.tz));
  }

  // ─── timestamps ────────────────────────────────────────────────

  /** Millisecond timestamps (Unix epoch). */
  get asi8(): number[] {
    return this._values.map((d) => d.getTime());
  }

  /** Date-only values (midnight UTC). */
  get date(): Date[] {
    return this._values.map((d) => {
      const y = component(d, this.tz, "year");
      const m = component(d, this.tz, "month");
      const day = component(d, this.tz, "day");
      return new Date(Date.UTC(y, m - 1, day));
    });
  }

  // ─── timezone operations ────────────────────────────────────────

  /**
   * Assign a timezone to a tz-naive index (analogous to `pandas.tz_localize`).
   * Treats the stored UTC times as local times in the given timezone, then
   * converts them back to UTC.
   *
   * Pass `null` to remove the timezone (strip / localize to no-tz).
   */
  tz_localize(tz: string | null): DatetimeIndex {
    if (tz === null) {
      return new DatetimeIndex(this._values, { name: this.name, tz: null });
    }
    // Interpret each stored Date's UTC fields as local time in `tz`.
    const localized = this._values.map((d) => {
      const offset = tzOffsetMs(d, tz);
      return new Date(d.getTime() - offset);
    });
    return new DatetimeIndex(localized, { name: this.name, tz });
  }

  /**
   * Convert to a different timezone (analogous to `pandas.tz_convert`).
   * Requires the index to already be tz-aware.
   */
  tz_convert(tz: string): DatetimeIndex {
    // UTC timestamps remain the same; only the timezone annotation changes.
    return new DatetimeIndex([...this._values], { name: this.name, tz });
  }

  // ─── formatting ────────────────────────────────────────────────

  /** Format each datetime using a strftime-style format string. */
  strftime(fmt: string): string[] {
    return this._values.map((d) => formatDate(d, fmt, this.tz));
  }

  // ─── normalization ─────────────────────────────────────────────

  /** Floor all datetimes to midnight (local midnight when tz is set). */
  normalize(): DatetimeIndex {
    const normed = this._values.map((d) => {
      if (this.tz === null) {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      }
      const lp = getLocalParts(d, this.tz);
      const midnightUtc = new Date(
        Date.UTC(lp.year, lp.month - 1, lp.day) - tzOffsetMs(d, this.tz),
      );
      return midnightUtc;
    });
    return new DatetimeIndex(normed, { name: this.name, tz: this.tz });
  }

  // ─── floor / ceil / round ──────────────────────────────────────

  /**
   * Floor each datetime to the nearest multiple of `freq`.
   * Only fixed-duration frequencies are supported (D, H, T/min, S, ms).
   */
  floor(freq: string): DatetimeIndex {
    const { mult, unit } = parseFreq(freq);
    const freqMs = resolveFixedMs(unit, mult);
    const floored = this._values.map((d) => floorDate(d, freqMs));
    return new DatetimeIndex(floored, { name: this.name, tz: this.tz });
  }

  /**
   * Ceil each datetime to the nearest multiple of `freq`.
   * Only fixed-duration frequencies are supported.
   */
  ceil(freq: string): DatetimeIndex {
    const { mult, unit } = parseFreq(freq);
    const freqMs = resolveFixedMs(unit, mult);
    const ceiled = this._values.map((d) => ceilDate(d, freqMs));
    return new DatetimeIndex(ceiled, { name: this.name, tz: this.tz });
  }

  /**
   * Round each datetime to the nearest multiple of `freq`.
   * Only fixed-duration frequencies are supported.
   */
  round(freq: string): DatetimeIndex {
    const { mult, unit } = parseFreq(freq);
    const freqMs = resolveFixedMs(unit, mult);
    const rounded = this._values.map((d) => roundDate(d, freqMs));
    return new DatetimeIndex(rounded, { name: this.name, tz: this.tz });
  }

  // ─── shift ─────────────────────────────────────────────────────

  /**
   * Shift each datetime by `n` periods of `freq`.
   * Supports both fixed and calendar frequencies.
   */
  shift(n: number, freq = "D"): DatetimeIndex {
    const { mult, unit } = parseFreq(freq);
    const shifted = this._values.map((d) => shiftDate(d, unit, mult * n));
    return new DatetimeIndex(shifted, { name: this.name, tz: this.tz });
  }

  // ─── rename ────────────────────────────────────────────────────

  /** Return a copy with a new name. */
  rename(name: string | null): DatetimeIndex {
    return new DatetimeIndex([...this._values], { name, tz: this.tz });
  }

  // ─── overridden Index ops ──────────────────────────────────────

  toString(): string {
    const tzStr = this.tz !== null ? `, tz='${this.tz}'` : "";
    return `DatetimeIndex([${this._values.map((d) => d.toISOString()).join(", ")}]${tzStr}, dtype='${String(this.dtype)}', length=${this.size})`;
  }
}

// ─── shiftDate helper ─────────────────────────────────────────────────────────

/** Shift a single Date by n units (positive or negative). */
function shiftDate(d: Date, unit: string, n: number): Date {
  if (isFixedFreq(unit)) {
    const msPerUnit = FIXED_FREQ_MS[unit] ?? 1;
    return new Date(d.getTime() + msPerUnit * n);
  }
  if (n === 0) {
    return d;
  }
  // Calendar shift: iterate step by step (handles negative n).
  const steps = Math.abs(n);
  const forward = n > 0;
  let cur = d;
  for (let i = 0; i < steps; i++) {
    cur = forward ? nextCalendarStep(cur, unit, 1) : prevCalendarStep(cur, unit, 1);
  }
  return cur;
}

/** Move backwards one calendar step. */
function prevCalendarStep(d: Date, unit: string, mult: number): Date {
  switch (unit) {
    case "MS":
      return monthStart(addMonths(d, -mult));
    case "ME":
      return monthEnd(addMonths(monthStart(d), -mult));
    case "QS":
      return quarterStart(addMonths(d, -mult * 3));
    case "QE":
      return quarterEnd(addMonths(quarterStart(d), -mult * 3));
    case "YS":
      return yearStart(addMonths(d, -mult * 12));
    case "YE":
      return yearEnd(addMonths(yearStart(d), -mult * 12));
    default:
      throw new Error(`Unknown calendar freq unit: ${unit}`);
  }
}

/** Resolve a fixed frequency to milliseconds. Throws for calendar frequencies. */
function resolveFixedMs(unit: string, mult: number): number {
  if (!isFixedFreq(unit)) {
    throw new Error(
      `Frequency "${unit}" is calendar-based and cannot be used with floor/ceil/round`,
    );
  }
  return (FIXED_FREQ_MS[unit] ?? 1) * mult;
}

// ─── date_range ───────────────────────────────────────────────────────────────

/**
 * Generate a `DatetimeIndex` with evenly-spaced datetimes.
 *
 * Mirrors `pd.date_range`. Provide exactly two of: `start`, `end`, `periods`.
 * The `freq` parameter controls step size (default `"D"`).
 *
 * @example
 * ```ts
 * date_range("2024-01-01", { periods: 3, freq: "D" });
 * // DatetimeIndex(["2024-01-01", "2024-01-02", "2024-01-03"])
 *
 * date_range("2024-01-01", { end: "2024-03-01", freq: "MS" });
 * // DatetimeIndex(["2024-01-01", "2024-02-01", "2024-03-01"])
 * ```
 */
export function date_range(start: string | Date, options: DateRangeOptions = {}): DatetimeIndex {
  const startDate = coerceDate(start);
  if (startDate === null) {
    throw new Error(`Invalid start date: ${String(start)}`);
  }
  const endDate =
    options.end !== null && options.end !== undefined ? coerceDate(options.end) : null;
  const periods = options.periods ?? null;
  const freq = options.freq ?? "D";
  const tz = options.tz ?? null;

  const { mult, unit } = parseFreq(freq);

  let dates: Date[];
  if (isFixedFreq(unit)) {
    const freqMs = (FIXED_FREQ_MS[unit] ?? 1) * mult;
    const count = resolveCountFixed(startDate, endDate, periods, freqMs);
    dates = buildFixedRange(startDate, freqMs, count);
  } else {
    const count = resolveCountCalendar(startDate, endDate, periods, unit, mult);
    dates = buildCalendarRange(startDate, unit, mult, count);
  }

  return new DatetimeIndex(dates, { tz, name: options.name ?? null });
}
