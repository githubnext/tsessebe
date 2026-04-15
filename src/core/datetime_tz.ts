/**
 * Timezone-aware DatetimeIndex: tz_localize and tz_convert.
 *
 * Mirrors `pandas.DatetimeIndex.tz_localize` and
 * `pandas.DatetimeIndex.tz_convert`.
 *
 * Uses the IANA timezone database via `Intl.DateTimeFormat` — built into
 * every modern JS engine including Bun.  No external dependencies.
 *
 * | Function | Description |
 * |---|---|
 * | {@link tz_localize} | Naive → tz-aware (interprets wall-clock times) |
 * | {@link tz_convert} | Tz-aware → tz-aware (same UTC, new display tz) |
 *
 * @example
 * ```ts
 * import { date_range } from "./date_range.ts";
 * import { tz_localize, tz_convert } from "./datetime_tz.ts";
 *
 * const naive = date_range({ start: "2024-01-01", periods: 3 });
 * const ny    = tz_localize(naive, "America/New_York");
 * ny.at(0).toISOString();   // "2024-01-01T05:00:00.000Z"  (UTC-5 in Jan)
 *
 * const utcIdx = tz_convert(ny, "UTC");
 * utcIdx.toLocalStrings();  // ["2024-01-01T05:00:00.000+00:00", ...]
 * ```
 *
 * @module
 */

import { DatetimeIndex } from "./date_range.ts";

// ─── internal helpers ─────────────────────────────────────────────────────────

/**
 * Return the UTC offset (ms) for `tz` at the given UTC instant.
 *
 * The offset is defined as `localMs - utcMs`, where `localMs` is the UTC
 * representation of the wall-clock value in `tz` at that instant.
 *
 * For example, at 2024-01-01T05:00:00Z, America/New_York is on EST (UTC-5),
 * so the offset is −18 000 000 ms.
 */
function utcOffsetMs(utcMs: number, tz: string): number {
  const d = new Date(utcMs);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const p of parts) {
    switch (p.type) {
      case "year":
        year = Number(p.value);
        break;
      case "month":
        month = Number(p.value);
        break;
      case "day":
        day = Number(p.value);
        break;
      case "hour":
        hour = Number(p.value) % 24; // "24" can appear for midnight in some impls
        break;
      case "minute":
        minute = Number(p.value);
        break;
      case "second":
        second = Number(p.value);
        break;
      default:
        break;
    }
  }

  const localMs = Date.UTC(year, month - 1, day, hour, minute, second);
  return localMs - utcMs;
}

/**
 * Convert a wall-clock time (expressed as a UTC millisecond value whose UTC
 * date/time components equal the desired local time) to the actual UTC
 * equivalent in `tz`.
 *
 * Uses two-step offset refinement to handle DST transitions:
 *
 * - Spring-forward non-existent times: shifted forward to after the gap.
 * - Fall-back ambiguous times: the pre-transition (EDT) occurrence is used.
 */
function wallClockToUtc(wallMs: number, tz: string): number {
  const off1 = utcOffsetMs(wallMs, tz);
  const est = wallMs - off1;
  const off2 = utcOffsetMs(est, tz);
  // If both offsets agree, est is correct.  If they differ (DST boundary),
  // the second offset is the one actually in effect at the target UTC time.
  return wallMs - off2;
}

/**
 * Format a UTC timestamp as a local ISO-8601 string in `tz`.
 *
 * Output format: `"YYYY-MM-DDTHH:mm:ss.000±HH:MM"`
 */
function formatInTz(utcMs: number, tz: string): string {
  const d = new Date(utcMs);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  let year = "";
  let month = "";
  let day = "";
  let hour = "";
  let minute = "";
  let second = "";

  for (const p of parts) {
    switch (p.type) {
      case "year":
        year = p.value;
        break;
      case "month":
        month = p.value;
        break;
      case "day":
        day = p.value;
        break;
      case "hour":
        hour = String(Number(p.value) % 24).padStart(2, "0");
        break;
      case "minute":
        minute = p.value;
        break;
      case "second":
        second = p.value;
        break;
      default:
        break;
    }
  }

  const offsetMs = utcOffsetMs(utcMs, tz);
  const sign = offsetMs >= 0 ? "+" : "-";
  const absMs = Math.abs(offsetMs);
  const offsetH = String(Math.floor(absMs / 3_600_000)).padStart(2, "0");
  const offsetM = String(Math.floor((absMs % 3_600_000) / 60_000)).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000${sign}${offsetH}:${offsetM}`;
}

// ─── TZDatetimeIndex ──────────────────────────────────────────────────────────

/**
 * A timezone-aware DatetimeIndex — the TypeScript equivalent of a tz-aware
 * `pandas.DatetimeIndex`.
 *
 * Internally stores **UTC millisecond** timestamps.  The {@link tz} property
 * records the IANA timezone (e.g. `"America/New_York"`, `"Europe/London"`,
 * `"UTC"`).  Display methods such as {@link toLocalStrings} convert to local
 * time on-the-fly.
 *
 * Typical usage:
 * ```ts
 * const naive  = date_range({ start: "2024-01-01", periods: 3 });
 * const ny     = tz_localize(naive, "America/New_York");
 * const london = ny.tz_convert("Europe/London");
 * london.toLocalStrings();
 * // ["2024-01-01T05:00:00.000+00:00", "2024-01-02T05:00:00.000+00:00", ...]
 * ```
 */
export class TZDatetimeIndex {
  private readonly _utcMs: readonly number[];

  /** IANA timezone name (e.g. `"UTC"`, `"America/New_York"`, `"Asia/Kolkata"`). */
  readonly tz: string;

  /** Optional human-readable label for this axis. */
  readonly name: string | null;

  /** @internal */
  constructor(utcMs: readonly number[], tz: string, name: string | null) {
    this._utcMs = Object.freeze([...utcMs]);
    this.tz = tz;
    this.name = name;
  }

  // ─── properties ──────────────────────────────────────────────────

  /** Number of elements. */
  get size(): number {
    return this._utcMs.length;
  }

  /** Shape tuple `[size]`. */
  get shape(): [number] {
    return [this._utcMs.length];
  }

  /** Number of dimensions (always `1`). */
  get ndim(): 1 {
    return 1;
  }

  /** `true` when the index has zero elements. */
  get empty(): boolean {
    return this._utcMs.length === 0;
  }

  /**
   * Raw UTC millisecond timestamps (the underlying storage).
   *
   * Use {@link at} to retrieve a `Date` at a specific position.
   */
  get values(): readonly number[] {
    return this._utcMs;
  }

  // ─── element access ───────────────────────────────────────────────

  /**
   * Return the UTC `Date` at position `i` (0-based).
   *
   * @throws `RangeError` if `i` is out of bounds.
   */
  at(i: number): Date {
    const ms = this._utcMs[i];
    if (ms === undefined) {
      throw new RangeError(`Index ${i} out of bounds (size=${this.size})`);
    }
    return new Date(ms);
  }

  /** Shallow copy as a plain mutable array of UTC `Date` objects. */
  toArray(): Date[] {
    return this._utcMs.map((ms) => new Date(ms));
  }

  /** Raw UTC millisecond timestamps as a mutable array. */
  toTimestamps(): number[] {
    return [...this._utcMs];
  }

  // ─── formatting ───────────────────────────────────────────────────

  /**
   * Return each timestamp formatted as a local ISO-8601 string in this
   * index's timezone.
   *
   * Format: `"YYYY-MM-DDTHH:mm:ss.000±HH:MM"`
   *
   * @example
   * ```ts
   * const idx = tz_localize(date_range({ start: "2024-01-01", periods: 1 }),
   *                         "America/New_York");
   * idx.toLocalStrings(); // ["2024-01-01T00:00:00.000-05:00"]
   * ```
   */
  toLocalStrings(): string[] {
    return this._utcMs.map((ms) => formatInTz(ms, this.tz));
  }

  // ─── conversion ───────────────────────────────────────────────────

  /**
   * Convert this tz-aware index to a different timezone.
   *
   * The UTC timestamps are **preserved**; only the display timezone changes.
   *
   * Mirrors `pandas.DatetimeIndex.tz_convert(tz)`.
   *
   * @param tz - IANA timezone identifier.
   * @example
   * ```ts
   * const ny = tz_localize(date_range({ start: "2024-01-01", periods: 1 }),
   *                        "America/New_York");
   * const london = ny.tz_convert("Europe/London");
   * london.toLocalStrings(); // ["2024-01-01T05:00:00.000+00:00"]
   * ```
   */
  tz_convert(tz: string): TZDatetimeIndex {
    return new TZDatetimeIndex(this._utcMs, tz, this.name);
  }

  /**
   * Strip the timezone, returning a tz-naive {@link DatetimeIndex} whose
   * values are the raw UTC timestamps.
   *
   * Equivalent to `pandas.DatetimeIndex.tz_localize(None)`.
   *
   * @example
   * ```ts
   * const ny = tz_localize(date_range({ start: "2024-01-01", periods: 1 }),
   *                        "America/New_York");
   * ny.tz_localize_none().at(0).toISOString(); // "2024-01-01T05:00:00.000Z"
   * ```
   */
  tz_localize_none(): DatetimeIndex {
    return DatetimeIndex.fromTimestamps(this._utcMs, this.name);
  }

  // ─── statistics ───────────────────────────────────────────────────

  /**
   * Earliest timestamp (UTC), or `null` if empty.
   *
   * @example
   * ```ts
   * const idx = tz_localize(date_range({ start: "2024-01-01", periods: 3 }),
   *                         "UTC");
   * idx.min()?.toISOString(); // "2024-01-01T00:00:00.000Z"
   * ```
   */
  min(): Date | null {
    if (this._utcMs.length === 0) {
      return null;
    }
    let best = this._utcMs[0] as number;
    for (const ms of this._utcMs) {
      if (ms < best) {
        best = ms;
      }
    }
    return new Date(best);
  }

  /**
   * Latest timestamp (UTC), or `null` if empty.
   *
   * @example
   * ```ts
   * const idx = tz_localize(date_range({ start: "2024-01-01", periods: 3 }),
   *                         "UTC");
   * idx.max()?.toISOString(); // "2024-01-03T00:00:00.000Z"
   * ```
   */
  max(): Date | null {
    if (this._utcMs.length === 0) {
      return null;
    }
    let best = this._utcMs[0] as number;
    for (const ms of this._utcMs) {
      if (ms > best) {
        best = ms;
      }
    }
    return new Date(best);
  }

  // ─── transformation ───────────────────────────────────────────────

  /**
   * Return a sorted copy (by UTC timestamp).
   *
   * @param ascending - Sort direction; defaults to `true`.
   */
  sort(ascending = true): TZDatetimeIndex {
    const sorted = [...this._utcMs].sort((a, b) => (ascending ? a - b : b - a));
    return new TZDatetimeIndex(sorted, this.tz, this.name);
  }

  /**
   * Return a new index with duplicate UTC timestamps removed (first
   * occurrence kept).
   */
  unique(): TZDatetimeIndex {
    const seen = new Set<number>();
    const out: number[] = [];
    for (const ms of this._utcMs) {
      if (!seen.has(ms)) {
        seen.add(ms);
        out.push(ms);
      }
    }
    return new TZDatetimeIndex(out, this.tz, this.name);
  }

  /**
   * Return a new index containing only elements that satisfy `predicate`.
   */
  filter(predicate: (d: Date, i: number) => boolean): TZDatetimeIndex {
    const out: number[] = [];
    this._utcMs.forEach((ms, i) => {
      if (predicate(new Date(ms), i)) {
        out.push(ms);
      }
    });
    return new TZDatetimeIndex(out, this.tz, this.name);
  }

  /**
   * Return a slice `[start, stop)`.
   *
   * @param start - Inclusive start index (0-based).
   * @param stop  - Exclusive stop index; defaults to `this.size`.
   */
  slice(start: number, stop?: number): TZDatetimeIndex {
    return new TZDatetimeIndex(this._utcMs.slice(start, stop), this.tz, this.name);
  }

  /**
   * Return a new index formed by appending `other` after this index.
   *
   * The two indexes **must share the same timezone** — a `RangeError` is
   * thrown otherwise to prevent silent data corruption.
   */
  concat(other: TZDatetimeIndex): TZDatetimeIndex {
    if (other.tz !== this.tz) {
      throw new RangeError(
        `concat: timezone mismatch ("${this.tz}" vs "${other.tz}"). Convert to the same timezone first with tz_convert.`,
      );
    }
    return new TZDatetimeIndex([...this._utcMs, ...other._utcMs], this.tz, this.name);
  }

  /**
   * Return `true` if any element has the same UTC millisecond value as
   * `date`.
   */
  contains(date: Date): boolean {
    const ms = date.getTime();
    return this._utcMs.some((t) => t === ms);
  }

  // ─── iteration ───────────────────────────────────────────────────

  [Symbol.iterator](): Iterator<Date> {
    let i = 0;
    const arr = this._utcMs;
    return {
      next(): IteratorResult<Date> {
        if (i >= arr.length) {
          return { done: true, value: undefined };
        }
        const ms = arr[i];
        i++;
        if (ms === undefined) {
          return { done: true, value: undefined };
        }
        return { done: false, value: new Date(ms) };
      },
    };
  }
}

// ─── tz_localize ──────────────────────────────────────────────────────────────

/**
 * Localize a tz-naive {@link DatetimeIndex} to the given timezone.
 *
 * Each timestamp's **UTC date/time components** are treated as wall-clock
 * times in `tz`; the function converts them to the actual UTC equivalents.
 *
 * Mirrors `pandas.DatetimeIndex.tz_localize(tz)`.
 *
 * **DST handling:**
 * - For non-existent times (spring-forward gap): shifted forward to after
 *   the gap.
 * - For ambiguous times (fall-back overlap): the pre-transition occurrence
 *   is used.
 *
 * @param idx - Tz-naive index whose UTC components are the desired wall-clock
 *   times.
 * @param tz  - IANA timezone identifier (e.g. `"America/New_York"`).
 *
 * @example
 * ```ts
 * const naive = date_range({ start: "2024-01-01", periods: 3 });
 * const ny    = tz_localize(naive, "America/New_York");
 * ny.tz;                         // "America/New_York"
 * ny.size;                       // 3
 * ny.at(0).toISOString();        // "2024-01-01T05:00:00.000Z"
 * ny.toLocalStrings()[0];        // "2024-01-01T00:00:00.000-05:00"
 * ```
 */
export function tz_localize(idx: DatetimeIndex, tz: string): TZDatetimeIndex {
  const utcMs = idx.values.map((d) => wallClockToUtc(d.getTime(), tz));
  return new TZDatetimeIndex(utcMs, tz, idx.name);
}

// ─── tz_convert ───────────────────────────────────────────────────────────────

/**
 * Convert a {@link TZDatetimeIndex} to a new timezone.
 *
 * A free-function alias for {@link TZDatetimeIndex.tz_convert}.
 *
 * The UTC timestamps are **preserved**; only the display timezone changes.
 *
 * @param idx - Tz-aware index to convert.
 * @param tz  - Target IANA timezone identifier.
 *
 * @example
 * ```ts
 * const ny = tz_localize(date_range({ start: "2024-01-01", periods: 1 }),
 *                        "America/New_York");
 * const london = tz_convert(ny, "Europe/London");
 * london.tz;                  // "Europe/London"
 * london.toLocalStrings()[0]; // "2024-01-01T05:00:00.000+00:00"
 * ```
 */
export function tz_convert(idx: TZDatetimeIndex, tz: string): TZDatetimeIndex {
  return idx.tz_convert(tz);
}
