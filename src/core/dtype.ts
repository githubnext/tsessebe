/**
 * Dtype system — immutable singleton descriptors for all pandas-equivalent dtypes.
 *
 * Mirrors pandas' dtype hierarchy: numeric (int, uint, float), bool, string,
 * object, datetime, timedelta, and category. Each Dtype is a flyweight (cached
 * singleton keyed by name) so identity comparisons (`===`) work correctly.
 */

import type { DtypeName, Scalar } from "../types.ts";

/** Classification of a dtype into a broad "kind". */
export type DtypeKind =
  | "int"
  | "uint"
  | "float"
  | "bool"
  | "string"
  | "object"
  | "datetime"
  | "timedelta"
  | "category";

/** Size of a single element in bytes (0 = variable / unknown). */
export type ItemSize = 0 | 1 | 2 | 4 | 8;

const _registry = new Map<DtypeName, Dtype>();

interface InferFlags {
  allBool: boolean;
  allInt: boolean;
  allFloat: boolean;
  allDate: boolean;
  allString: boolean;
}

/**
 * An immutable descriptor for a data type.
 *
 * Obtain instances via the static factory methods or the `Dtype` named
 * constants rather than the constructor.
 *
 * @example
 * ```ts
 * const dt = Dtype.float64;
 * dt.isNumeric; // true
 * dt.itemsize;  // 8
 * Dtype.from("float64") === dt; // true — singletons
 * ```
 */
export class Dtype {
  readonly name: DtypeName;
  readonly kind: DtypeKind;
  readonly itemsize: ItemSize;

  private constructor(name: DtypeName, kind: DtypeKind, itemsize: ItemSize) {
    this.name = name;
    this.kind = kind;
    this.itemsize = itemsize;
  }

  // ─── singleton factory ──────────────────────────────────────────

  /** Return (or create) the singleton for `name`. */
  static from(name: DtypeName): Dtype {
    const cached = _registry.get(name);
    if (cached !== undefined) {
      return cached;
    }
    const dt = Dtype.build(name);
    _registry.set(name, dt);
    return dt;
  }

  private static build(name: DtypeName): Dtype {
    switch (name) {
      case "int8":
        return new Dtype("int8", "int", 1);
      case "int16":
        return new Dtype("int16", "int", 2);
      case "int32":
        return new Dtype("int32", "int", 4);
      case "int64":
        return new Dtype("int64", "int", 8);
      case "uint8":
        return new Dtype("uint8", "uint", 1);
      case "uint16":
        return new Dtype("uint16", "uint", 2);
      case "uint32":
        return new Dtype("uint32", "uint", 4);
      case "uint64":
        return new Dtype("uint64", "uint", 8);
      case "float32":
        return new Dtype("float32", "float", 4);
      case "float64":
        return new Dtype("float64", "float", 8);
      case "bool":
        return new Dtype("bool", "bool", 1);
      case "string":
        return new Dtype("string", "string", 0);
      case "object":
        return new Dtype("object", "object", 0);
      case "datetime":
        return new Dtype("datetime", "datetime", 8);
      case "timedelta":
        return new Dtype("timedelta", "timedelta", 8);
      case "category":
        return new Dtype("category", "category", 0);
    }
  }

  // ─── named singletons ───────────────────────────────────────────

  static readonly int8 = Dtype.from("int8");
  static readonly int16 = Dtype.from("int16");
  static readonly int32 = Dtype.from("int32");
  static readonly int64 = Dtype.from("int64");
  static readonly uint8 = Dtype.from("uint8");
  static readonly uint16 = Dtype.from("uint16");
  static readonly uint32 = Dtype.from("uint32");
  static readonly uint64 = Dtype.from("uint64");
  static readonly float32 = Dtype.from("float32");
  static readonly float64 = Dtype.from("float64");
  static readonly bool = Dtype.from("bool");
  static readonly string = Dtype.from("string");
  static readonly object = Dtype.from("object");
  static readonly datetime = Dtype.from("datetime");
  static readonly timedelta = Dtype.from("timedelta");
  static readonly category = Dtype.from("category");

  // ─── type predicates ────────────────────────────────────────────

  get isNumeric(): boolean {
    return this.kind === "int" || this.kind === "uint" || this.kind === "float";
  }

  get isInteger(): boolean {
    return this.kind === "int" || this.kind === "uint";
  }

  get isSignedInteger(): boolean {
    return this.kind === "int";
  }

  get isUnsignedInteger(): boolean {
    return this.kind === "uint";
  }

  get isFloat(): boolean {
    return this.kind === "float";
  }

  get isBool(): boolean {
    return this.kind === "bool";
  }

  get isString(): boolean {
    return this.kind === "string";
  }

  get isDatetime(): boolean {
    return this.kind === "datetime";
  }

  get isTimedelta(): boolean {
    return this.kind === "timedelta";
  }

  get isCategory(): boolean {
    return this.kind === "category";
  }

  get isObject(): boolean {
    return this.kind === "object";
  }

  // ─── casting / promotion ────────────────────────────────────────

  /**
   * True when values of `this` dtype can be safely cast to `target`
   * without loss of information.
   */
  canCastTo(target: Dtype): boolean {
    if (this === target) {
      return true;
    }
    // Numeric promotion rules (mirrors numpy safe casting).
    const order: readonly DtypeName[] = [
      "int8",
      "int16",
      "int32",
      "int64",
      "uint8",
      "uint16",
      "uint32",
      "uint64",
      "float32",
      "float64",
    ];
    const fromIdx = order.indexOf(this.name);
    const toIdx = order.indexOf(target.name);
    if (fromIdx !== -1 && toIdx !== -1) {
      // Unsigned → signed: only safe if there's enough headroom.
      if (this.isUnsignedInteger && target.isSignedInteger) {
        return target.itemsize > this.itemsize;
      }
      return toIdx >= fromIdx;
    }
    // bool → any numeric is safe.
    if (this.isBool && target.isNumeric) {
      return true;
    }
    // string → object is safe.
    if (this.isString && target.isObject) {
      return true;
    }
    return false;
  }

  /**
   * Return the smallest dtype that can represent both `a` and `b` without loss.
   * Falls back to `object` when no numeric promotion exists.
   */
  static commonType(a: Dtype, b: Dtype): Dtype {
    if (a === b) {
      return a;
    }
    if (a.canCastTo(b)) {
      return b;
    }
    if (b.canCastTo(a)) {
      return a;
    }
    // Mixed int / float → float64.
    if (a.isNumeric && b.isNumeric) {
      return Dtype.float64;
    }
    // bool + numeric → numeric.
    if (a.isBool && b.isNumeric) {
      return b;
    }
    if (b.isBool && a.isNumeric) {
      return a;
    }
    // Anything else → object.
    return Dtype.object;
  }

  // ─── inference ──────────────────────────────────────────────────

  /**
   * Infer the most specific dtype from an array of scalar values.
   *
   * Rules (in priority order):
   * 1. Empty array → float64 (pandas default).
   * 2. All booleans → bool.
   * 3. All integers (number without fractional part, no NaN/Inf) → int64.
   * 4. All finite/NaN numbers → float64.
   * 5. All Date objects → datetime.
   * 6. All strings → string.
   * 7. Otherwise → object.
   */
  static inferFrom(values: readonly Scalar[]): Dtype {
    if (values.length === 0) {
      return Dtype.float64;
    }
    const flags = Dtype.scanFlags(values);
    return Dtype.flagsToDtype(flags);
  }

  private static scanFlags(values: readonly Scalar[]): InferFlags {
    const flags: InferFlags = {
      allBool: true,
      allInt: true,
      allFloat: true,
      allDate: true,
      allString: true,
    };
    for (const v of values) {
      if (v === null || v === undefined) {
        continue;
      }
      Dtype.updateFlags(flags, v);
    }
    return flags;
  }

  private static updateFlags(flags: InferFlags, v: NonNullable<Scalar>): void {
    const t = typeof v;
    if (t !== "boolean") {
      flags.allBool = false;
    }
    if (t === "boolean") {
      flags.allString = false;
      flags.allDate = false;
    } else if (t === "number") {
      flags.allString = false;
      flags.allDate = false;
      if (!(Number.isFinite(v as number) && Number.isInteger(v as number))) {
        flags.allInt = false;
      }
    } else if (v instanceof Date) {
      flags.allString = false;
      flags.allInt = false;
      flags.allFloat = false;
      flags.allBool = false;
    } else if (t === "string") {
      flags.allInt = false;
      flags.allFloat = false;
      flags.allDate = false;
      flags.allBool = false;
    } else {
      flags.allBool = false;
      flags.allInt = false;
      flags.allFloat = false;
      flags.allDate = false;
      flags.allString = false;
    }
  }

  private static flagsToDtype(f: InferFlags): Dtype {
    if (f.allBool) {
      return Dtype.bool;
    }
    if (f.allInt) {
      return Dtype.int64;
    }
    if (f.allFloat) {
      return Dtype.float64;
    }
    if (f.allDate) {
      return Dtype.datetime;
    }
    if (f.allString) {
      return Dtype.string;
    }
    return Dtype.object;
  }

  // ─── misc ────────────────────────────────────────────────────────

  toString(): string {
    return this.name;
  }

  /** Equality: dtypes are singletons, so reference equality suffices. */
  equals(other: Dtype): boolean {
    return this === other;
  }
}
