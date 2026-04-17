/**
 * date_range — generate a fixed-frequency sequence of Date objects.
 *
 * Mirrors `pandas.date_range()`:
 * - Specify at least two of `start`, `end`, `periods`
 * - `freq` controls step size (default `"D"`)
 * - `inclusive` controls endpoint inclusion (default `"both"`)
 *
 * Supported frequencies:
 * - `"D"` — calendar day
 * - `"B"` — business day (Mon–Fri)
 * - `"h"` / `"H"` — hour
 * - `"min"` / `"T"` — minute
 * - `"s"` / `"S"` — second
 * - `"ms"` / `"L"` — millisecond
 * - `"W"` / `"W-SUN"` … `"W-SAT"` — weekly, anchored to a weekday (default Sun)
 * - `"MS"` — month start; `"ME"` / `"M"` — month end
 * - `"QS"` — quarter start; `"QE"` / `"Q"` — quarter end
 * - `"YS"` / `"AS"` — year start; `"YE"` / `"A"` / `"Y"` — year end
 * - Multiplier prefix: `"2D"`, `"3H"`, etc.
 *
 * @module
 */

// ─── top-level regex constants (biome: useTopLevelRegex) ──────────────────────

/** Parse frequency string: optional integer prefix + unit token. */
const RE_FREQ =
  /^(\d+)?(D|B|h|H|T|min|s|S|ms|L|us|U|ns|W(?:-[A-Z]{3})?|MS|ME|M|QS|QE|Q|YS|YE|AS|A|Y)$/i;

// ─── public types ─────────────────────────────────────────────────────────────

/** Frequency string for `dateRange`. */
export type DateRangeFreq = string;

/** Which endpoints to include in the generated range. */
export type DateRangeInclusive = "both" | "neither" | "left" | "right";

/** Options for `dateRange`. */
export interface DateRangeOptions {
  /** Range start. At least two of start / end / periods must be provided. */
  start?: Date | string | number | null;
  /** Range end. At least two of start / end / periods must be provided. */
  end?: Date | string | number | null;
  /** Number of periods to generate. */
  periods?: number | null;
  /** Step frequency (default `"D"`). */
  freq?: DateRangeFreq | null;
  /** Which endpoints to include (default `"both"`). */
  inclusive?: DateRangeInclusive | null;
  /**
   * Normalize start/end to midnight UTC before generating.
   * Equivalent to `pandas.date_range(normalize=True)`.
   */
  normalize?: boolean | null;
}

// ─── internal types ────────────────────────────────────────────────────────────

/** Parsed representation of a frequency string. */
export interface ParsedFreq {
  /** Multiplier (e.g. 2 for "2D"). */
  n: number;
  /** Normalised unit string. */
  unit: string;
  /** Weekday anchor for "W" unit (JS: 0=Sun … 6=Sat). */
  anchor: number;
}

// ─── constants ────────────────────────────────────────────────────────────────

const DOW_MAP: Readonly<Record<string, number>> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;
const MS_MIN = 60_000;

/** Fixed-length unit → milliseconds (for arithmetic advance). */
const MS_TABLE: Readonly<Record<string, number>> = {
  D: MS_DAY,
  h: MS_HOUR,
  min: MS_MIN,
  s: 1_000,
  ms: 1,
};

/** Lookup table: raw unit string → canonical unit token. */
const UNIT_NORM: Readonly<Record<string, string>> = {
  H: "h",
  T: "min",
  MIN: "min",
  S: "s",
  L: "ms",
  MS: "ms", // handled separately — only in freq context; in unit context "MS" = month-start
  U: "us",
  US: "us",
  NS: "ns",
  A: "YE",
  Y: "YE",
  YE: "YE",
  AS: "YS",
  YS: "YS",
  Q: "QE",
  QE: "QE",
  M: "ME",
  ME: "ME",
};

// ─── frequency parsing ─────────────────────────────────────────────────────────

/**
 * Map a raw unit token (from the regex match) to its canonical form.
 * Returns the uppercased input unchanged if no mapping exists.
 */
function normaliseUnit(raw: string): string {
  const u = raw.toUpperCase();
  // "MS" as a unit token means month-start, not milliseconds
  if (u === "MS" || u === "QS" || u === "D" || u === "B") {
    return u;
  }
  return UNIT_NORM[u] ?? u;
}

/**
 * Parse a pandas-style frequency string into a `ParsedFreq`.
 * Throws `RangeError` for unrecognised patterns.
 */
export function parseFreq(freq: string): ParsedFreq {
  const m = RE_FREQ.exec(freq);
  if (!m) {
    throw new RangeError(`Unrecognised frequency string: "${freq}"`);
  }
  const n = m[1] !== undefined ? Number.parseInt(m[1], 10) : 1;
  const rawUnit = m[2] ?? "D";
  let unit = normaliseUnit(rawUnit);
  let anchor = 0;

  if (unit.startsWith("W")) {
    const dash = unit.indexOf("-");
    if (dash !== -1) {
      const dowStr = unit.slice(dash + 1);
      anchor = DOW_MAP[dowStr] ?? 0;
    }
    unit = "W";
  }

  return { n, unit, anchor };
}

// ─── date-input helper ─────────────────────────────────────────────────────────

/**
 * Convert a `Date | string | number` to a `Date`.
 * Throws `TypeError` if the value cannot be parsed.
 */
export function toDateInput(v: Date | string | number): Date {
  if (v instanceof Date) {
    return v;
  }
  if (typeof v === "number") {
    return new Date(v);
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError(`Cannot parse date: "${v}"`);
  }
  return d;
}

/** Normalise a Date to midnight UTC on the same calendar date. */
function normToMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ─── arithmetic advance (fixed-ms units) ──────────────────────────────────────

/** Advance `d` by `n` fixed-ms steps for unit `unit`. */
function advanceMs(d: Date, n: number, unit: string): Date {
  const ms = (MS_TABLE[unit] ?? 1) * n;
  return new Date(d.getTime() + ms);
}

// ─── business-day advance ──────────────────────────────────────────────────────

/** Advance one business day forward. */
function addOneBizDay(d: Date): Date {
  const t = new Date(d.getTime() + MS_DAY);
  const dow = t.getUTCDay();
  if (dow === 0) {
    return new Date(t.getTime() + MS_DAY);
  }
  if (dow === 6) {
    return new Date(t.getTime() + 2 * MS_DAY);
  }
  return t;
}

/** Advance `n` business days forward. */
function addBizDays(d: Date, n: number): Date {
  let cur = d;
  for (let i = 0; i < n; i++) {
    cur = addOneBizDay(cur);
  }
  return cur;
}

/** Step back one business day. */
function subOneBizDay(d: Date): Date {
  const t = new Date(d.getTime() - MS_DAY);
  const dow = t.getUTCDay();
  if (dow === 0) {
    return new Date(t.getTime() - 2 * MS_DAY);
  }
  if (dow === 6) {
    return new Date(t.getTime() - MS_DAY);
  }
  return t;
}

/** Step back `n` business days. */
function subBizDays(d: Date, n: number): Date {
  let cur = d;
  for (let i = 0; i < n; i++) {
    cur = subOneBizDay(cur);
  }
  return cur;
}

// ─── weekly advance ───────────────────────────────────────────────────────────

/**
 * Advance `n` weeks from `d`, anchoring to weekday `anchor` (0=Sun…6=Sat).
 * Each step moves to the next occurrence of `anchor`.
 */
function addWeeks(d: Date, n: number, anchor: number): Date {
  const dow = d.getUTCDay();
  let daysUntil = (anchor - dow + 7) % 7;
  if (daysUntil === 0) {
    daysUntil = 7;
  }
  const firstStep = new Date(d.getTime() + daysUntil * MS_DAY);
  return new Date(firstStep.getTime() + (n - 1) * 7 * MS_DAY);
}

// ─── month helpers ─────────────────────────────────────────────────────────────

/** Days in month (UTC). */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Advance `d` by `n` months and snap to month-start (supports negative n). */
function addMonthStarts(d: Date, n: number): Date {
  const mo = d.getUTCMonth() + n;
  const y = d.getUTCFullYear() + Math.floor(mo / 12);
  const m = ((mo % 12) + 12) % 12;
  return new Date(Date.UTC(y, m, 1));
}

/** Advance `d` by `n` months and snap to month-end (supports negative n). */
function addMonthEnds(d: Date, n: number): Date {
  const mo = d.getUTCMonth() + n;
  const y = d.getUTCFullYear() + Math.floor(mo / 12);
  const m = ((mo % 12) + 12) % 12;
  return new Date(Date.UTC(y, m, daysInMonth(y, m)));
}

// ─── quarter helpers ───────────────────────────────────────────────────────────

/** Return the next quarter-start date strictly after `d`. */
function nextQStart(d: Date): Date {
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  for (const qm of [3, 6, 9] as const) {
    if (mo < qm) {
      return new Date(Date.UTC(y, qm, 1));
    }
  }
  return new Date(Date.UTC(y + 1, 0, 1));
}

/** Return the next quarter-end date strictly after `d`. */
function nextQEnd(d: Date): Date {
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  for (const qm of [2, 5, 8, 11] as const) {
    if (mo < qm) {
      return new Date(Date.UTC(y, qm, daysInMonth(y, qm)));
    }
  }
  return new Date(Date.UTC(y + 1, 2, 31));
}

/** Advance `n` quarter-starts from `d` (negative n = backward via months). */
function addQStarts(d: Date, n: number): Date {
  if (n < 0) {
    return addMonthStarts(d, n * 3);
  }
  let cur = d;
  for (let i = 0; i < n; i++) {
    cur = nextQStart(cur);
  }
  return cur;
}

/** Advance `n` quarter-ends from `d` (negative n = backward via months). */
function addQEnds(d: Date, n: number): Date {
  if (n < 0) {
    return addMonthEnds(d, n * 3);
  }
  let cur = d;
  for (let i = 0; i < n; i++) {
    cur = nextQEnd(cur);
  }
  return cur;
}

// ─── year helpers ──────────────────────────────────────────────────────────────

/** Advance `n` years and snap to Jan 1 (supports negative n). */
function addYearStarts(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear() + n, 0, 1));
}

/** Advance `n` years and snap to Dec 31 (supports negative n). */
function addYearEnds(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear() + n, 11, 31));
}

// ─── advance dispatcher ────────────────────────────────────────────────────────

/**
 * Return a new `Date` advanced by one step of `pf` from `d`.
 *
 * For fixed-ms units the result is arithmetic.
 * For calendar units the result is snapped to the next calendar boundary.
 */
export function advanceDate(d: Date, pf: ParsedFreq): Date {
  const { n, unit, anchor } = pf;
  if (unit in MS_TABLE) {
    return advanceMs(d, n, unit);
  }
  if (unit === "B") {
    return addBizDays(d, n);
  }
  if (unit === "W") {
    return addWeeks(d, n, anchor);
  }
  if (unit === "MS") {
    return addMonthStarts(d, n);
  }
  if (unit === "ME") {
    return addMonthEnds(d, n);
  }
  if (unit === "QS") {
    return addQStarts(d, n);
  }
  if (unit === "QE") {
    return addQEnds(d, n);
  }
  if (unit === "YS") {
    return addYearStarts(d, n);
  }
  if (unit === "YE") {
    return addYearEnds(d, n);
  }
  // sub-ms (us, ns): JS has no sub-ms precision — round to nearest ms
  const subMs = unit === "us" ? n / 1_000 : n / 1_000_000;
  return new Date(d.getTime() + Math.round(subMs));
}

/** Retreat one step of `pf` backward from `d`. */
function retreatDate(d: Date, pf: ParsedFreq): Date {
  const { n, unit } = pf;
  if (unit in MS_TABLE) {
    return advanceMs(d, -n, unit);
  }
  if (unit === "B") {
    return subBizDays(d, n);
  }
  if (unit === "W") {
    return new Date(d.getTime() - 7 * n * MS_DAY);
  }
  if (unit === "MS") {
    return addMonthStarts(d, -n);
  }
  if (unit === "ME") {
    return addMonthEnds(d, -n);
  }
  if (unit === "QS") {
    return addQStarts(d, -n);
  }
  if (unit === "QE") {
    return addQEnds(d, -n);
  }
  if (unit === "YS") {
    return addYearStarts(d, -n);
  }
  if (unit === "YE") {
    return addYearEnds(d, -n);
  }
  const subMs = unit === "us" ? n / 1_000 : n / 1_000_000;
  return new Date(d.getTime() - Math.round(subMs));
}

// ─── generation helpers ────────────────────────────────────────────────────────

/**
 * For anchor-based frequencies (e.g. "W"), snap `d` forward to the first
 * occurrence of the anchor day on or after `d`.  For all other frequencies
 * the date is returned unchanged.
 */
function snapToAnchor(d: Date, pf: ParsedFreq): Date {
  if (pf.unit === "W") {
    const dow = d.getUTCDay();
    const daysUntil = (pf.anchor - dow + 7) % 7;
    return daysUntil === 0 ? d : new Date(d.getTime() + daysUntil * MS_DAY);
  }
  return d;
}

/** Generate `count` dates starting from `start`, advancing by `pf` each step. */
function genFromStart(start: Date, count: number, pf: ParsedFreq): Date[] {
  const out: Date[] = [];
  let cur = snapToAnchor(start, pf);
  for (let i = 0; i < count; i++) {
    out.push(cur);
    cur = advanceDate(cur, pf);
  }
  return out;
}

/**
 * Generate all dates advancing from `start` while `≤ end`.
 * Returns an empty array if `start > end`.
 */
function genBetween(start: Date, end: Date, pf: ParsedFreq): Date[] {
  const out: Date[] = [];
  let cur = snapToAnchor(start, pf);
  while (cur.getTime() <= end.getTime()) {
    out.push(cur);
    const next = advanceDate(cur, pf);
    if (next.getTime() <= cur.getTime()) {
      break; // guard against infinite loop
    }
    cur = next;
  }
  return out;
}

/**
 * Compute the start date such that `(count - 1)` forward steps from it
 * land exactly on `end`.
 */
function startFromEnd(end: Date, count: number, pf: ParsedFreq): Date {
  let cur = end;
  for (let i = 0; i < count - 1; i++) {
    cur = retreatDate(cur, pf);
  }
  return cur;
}

/** Drop dates at endpoints per the `inclusive` option. */
function applyInclusive(
  dates: Date[],
  start: Date,
  end: Date,
  inclusive: DateRangeInclusive,
): Date[] {
  const incStart = inclusive === "both" || inclusive === "left";
  const incEnd = inclusive === "both" || inclusive === "right";
  const st = start.getTime();
  const et = end.getTime();
  return dates.filter((d) => {
    const t = d.getTime();
    if (!incStart && t === st) {
      return false;
    }
    if (!incEnd && t === et) {
      return false;
    }
    return true;
  });
}

// ─── case handlers ─────────────────────────────────────────────────────────────

/** Handle: start + periods, no end. */
function caseStartPeriods(
  startDate: Date,
  periods: number,
  pf: ParsedFreq,
  incl: DateRangeInclusive,
): Date[] {
  const raw = genFromStart(startDate, periods, pf);
  const last = raw.at(-1);
  if (last === undefined) {
    return [];
  }
  return applyInclusive(raw, startDate, last, incl);
}

/** Handle: end + periods, no start. */
function caseEndPeriods(
  endDate: Date,
  periods: number,
  pf: ParsedFreq,
  incl: DateRangeInclusive,
): Date[] {
  const synStart = startFromEnd(endDate, periods, pf);
  const raw = genFromStart(synStart, periods, pf);
  return applyInclusive(raw, synStart, endDate, incl);
}

/** Handle: start + end (periods ignored). */
function caseStartEnd(
  startDate: Date,
  endDate: Date,
  pf: ParsedFreq,
  incl: DateRangeInclusive,
): Date[] {
  const raw = genBetween(startDate, endDate, pf);
  return applyInclusive(raw, startDate, endDate, incl);
}

// ─── input parsing helper ──────────────────────────────────────────────────────

/** True when `v` is neither `null` nor `undefined`. */
function hasValue(v: unknown): boolean {
  return v !== undefined && v !== null;
}

/** Validate that at least two of the three inputs are present; throw otherwise. */
function requireTwoOf(hasStart: boolean, hasEnd: boolean, hasPeriods: boolean): void {
  if ((hasStart ? 1 : 0) + (hasEnd ? 1 : 0) + (hasPeriods ? 1 : 0) < 2) {
    throw new RangeError("dateRange: at least two of start, end, and periods must be provided");
  }
}

/** Parse and optionally normalise start/end inputs. */
function parseDateInputs(
  startRaw: Date | string | number | null | undefined,
  endRaw: Date | string | number | null | undefined,
  doNorm: boolean,
): { startDate: Date | null; endDate: Date | null } {
  let startDate = hasValue(startRaw) ? toDateInput(startRaw as Date | string | number) : null;
  let endDate = hasValue(endRaw) ? toDateInput(endRaw as Date | string | number) : null;
  if (doNorm) {
    if (startDate !== null) {
      startDate = normToMidnight(startDate);
    }
    if (endDate !== null) {
      endDate = normToMidnight(endDate);
    }
  }
  return { startDate, endDate };
}

// ─── public API ────────────────────────────────────────────────────────────────

/**
 * Generate a fixed-frequency sequence of `Date` objects.
 *
 * You must specify at least **two** of `start`, `end`, and `periods`.
 *
 * ```ts
 * import { dateRange } from "tsb";
 *
 * // 5 daily dates starting 2024-01-01
 * dateRange({ start: "2024-01-01", periods: 5 });
 * // → [Jan 1, Jan 2, Jan 3, Jan 4, Jan 5]
 *
 * // Hourly between two timestamps
 * dateRange({ start: "2024-01-01T00:00:00Z", end: "2024-01-01T06:00:00Z", freq: "h" });
 *
 * // Monthly (month-start) for 6 months
 * dateRange({ start: "2024-01-01", periods: 6, freq: "MS" });
 * ```
 */
export function dateRange(options: DateRangeOptions): Date[] {
  const { start: startRaw, end: endRaw, periods, freq: freqStr, inclusive, normalize } = options;

  const pf = parseFreq(freqStr ?? "D");
  const incl: DateRangeInclusive = inclusive ?? "both";

  const hasStart = hasValue(startRaw);
  const hasEnd = hasValue(endRaw);
  const hasPeriods = hasValue(periods) && (periods as number) > 0;

  requireTwoOf(hasStart, hasEnd, hasPeriods);

  const { startDate, endDate } = parseDateInputs(startRaw, endRaw, normalize === true);

  if (hasStart && hasPeriods && !hasEnd) {
    return caseStartPeriods(startDate as Date, periods as number, pf, incl);
  }
  if (hasEnd && hasPeriods && !hasStart) {
    return caseEndPeriods(endDate as Date, periods as number, pf, incl);
  }
  return caseStartEnd(startDate as Date, endDate as Date, pf, incl);
}
