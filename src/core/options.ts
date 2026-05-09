/**
 * options — pandas-compatible options system for tsb.
 *
 * Mirrors `pandas.core.config_init` / `pandas.get_option` / `pandas.set_option` etc.
 *
 * Supports:
 * - `getOption(key)` / `setOption(key, val)` / `resetOption(key)`
 * - `describeOption(key?)` — pretty-print option documentation
 * - `optionContext(key, val, ...)` — context-manager-like scoped override (async-safe via manual enter/exit)
 * - `registerOption(key, defaultVal, doc?, validator?)` — extend the registry
 * - `options` — a deep Proxy object providing `options.display.maxRows` style access
 *
 * @example
 * ```ts
 * import { getOption, setOption, resetOption, options } from "tsb";
 * getOption("display.max_rows");     // 60
 * setOption("display.max_rows", 20);
 * options.display.max_rows;          // 20
 * resetOption("display.max_rows");
 * ```
 *
 * @module
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Primitive option value types. */
export type OptionValue = string | number | boolean | null;

/** Validator function — returns an error string on invalid value, or undefined. */
export type OptionValidator = (val: OptionValue) => string | undefined;

interface OptionEntry {
  defaultValue: OptionValue;
  currentValue: OptionValue;
  doc: string;
  validator?: OptionValidator;
}

// ─── Internal registry ────────────────────────────────────────────────────────

const _registry = new Map<string, OptionEntry>();

function _normalizeKey(key: string): string {
  return key.toLowerCase().replace(/-/g, "_");
}

function _lookupEntry(key: string): OptionEntry {
  const k = _normalizeKey(key);
  const entry = _registry.get(k);
  if (entry === undefined) {
    throw new Error(
      `No such option: ${key}. Available options:\n${[..._registry.keys()].sort().join("\n")}`,
    );
  }
  return entry;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Register a new option with a key, default value, optional documentation, and
 * optional validator. Throws if the key is already registered.
 */
export function registerOption(
  key: string,
  defaultValue: OptionValue,
  doc = "",
  validator?: OptionValidator,
): void {
  const k = _normalizeKey(key);
  if (_registry.has(k)) {
    throw new Error(`Option already registered: ${key}`);
  }
  const entry: OptionEntry = { defaultValue, currentValue: defaultValue, doc };
  if (validator !== undefined) {
    entry.validator = validator;
  }
  _registry.set(k, entry);
}

/**
 * Retrieve the current value of an option by its dot-separated key.
 * Raises if the key does not exist.
 */
export function getOption(key: string): OptionValue {
  return _lookupEntry(key).currentValue;
}

/**
 * Set an option value. Validates with the registered validator, if any.
 * Raises if the key does not exist or the value is invalid.
 */
export function setOption(key: string, value: OptionValue): void {
  const entry = _lookupEntry(key);
  if (entry.validator !== undefined) {
    const err = entry.validator(value);
    if (err !== undefined) {
      throw new Error(`Invalid value for option '${key}': ${err}`);
    }
  }
  entry.currentValue = value;
}

/**
 * Reset one or all options to their default values.
 * Pass `"all"` to reset every option.
 */
export function resetOption(key: string): void {
  if (_normalizeKey(key) === "all") {
    for (const entry of _registry.values()) {
      entry.currentValue = entry.defaultValue;
    }
    return;
  }
  const entry = _lookupEntry(key);
  entry.currentValue = entry.defaultValue;
}

/**
 * Return a formatted string describing one or all options.
 * Pass a prefix to narrow results (e.g., `"display"`).
 */
export function describeOption(key?: string): string {
  const prefix = key !== undefined ? _normalizeKey(key) : "";
  const matches: string[] = [];
  for (const [k, entry] of _registry.entries()) {
    if (prefix === "" || k === prefix || k.startsWith(`${prefix}.`)) {
      matches.push(
        `${k}\n  Default : ${String(entry.defaultValue)}\n  Current : ${String(entry.currentValue)}\n  ${entry.doc}`,
      );
    }
  }
  if (matches.length === 0) {
    throw new Error(`No option matching: ${key ?? "(all)"}`);
  }
  return matches.join("\n\n");
}

// ─── Option Context ───────────────────────────────────────────────────────────

/** A scoped override token returned by {@link optionContext}. */
export interface OptionContextToken {
  /** Apply the overrides (call before the scoped block). */
  enter(): void;
  /** Restore the previous values (call after the scoped block). */
  exit(): void;
}

/**
 * Create a scoped override context for one or more options.
 * Pass alternating key–value pairs.
 *
 * @example
 * ```ts
 * const ctx = optionContext("display.max_rows", 5, "display.max_columns", 3);
 * ctx.enter();
 * // ... code that uses options ...
 * ctx.exit();
 * ```
 */
export function optionContext(
  ...keyValuePairs: readonly (OptionValue | string)[]
): OptionContextToken {
  if (keyValuePairs.length % 2 !== 0) {
    throw new Error("optionContext requires pairs of (key, value) arguments");
  }
  const pairs: Array<{ key: string; value: OptionValue }> = [];
  for (let i = 0; i < keyValuePairs.length; i += 2) {
    const k = keyValuePairs[i];
    const v = keyValuePairs[i + 1];
    if (typeof k !== "string") {
      throw new Error("optionContext keys must be strings");
    }
    pairs.push({ key: k, value: v as OptionValue });
  }

  const saved = new Map<string, OptionValue>();

  return {
    enter(): void {
      for (const { key, value } of pairs) {
        saved.set(key, getOption(key));
        setOption(key, value);
      }
    },
    exit(): void {
      for (const { key } of [...pairs].reverse()) {
        const prev = saved.get(key);
        if (prev !== undefined) {
          setOption(key, prev);
        }
      }
      saved.clear();
    },
  };
}

// ─── `options` Proxy ──────────────────────────────────────────────────────────

export interface OptionsProxy extends Record<string, OptionsProxy | OptionValue> {}

function _makeProxy(prefix: string): OptionsProxy {
  return new Proxy({} as OptionsProxy, {
    get(_target, prop: string | symbol): OptionsProxy | OptionValue {
      if (typeof prop !== "string") {
        return undefined as unknown as OptionValue;
      }
      const key = prefix !== "" ? `${prefix}.${prop}` : prop;
      // If there is a direct match, return its value
      const k = _normalizeKey(key);
      if (_registry.has(k)) {
        return _registry.get(k)!.currentValue;
      }
      // Otherwise return a nested proxy for deeper access
      return _makeProxy(k);
    },
    set(_target, prop: string | symbol, value: unknown): boolean {
      if (typeof prop !== "string") {
        return false;
      }
      const key = prefix !== "" ? `${prefix}.${prop}` : prop;
      setOption(key, value as OptionValue);
      return true;
    },
  });
}

/**
 * A deeply-nested proxy object that mirrors the options registry.
 * Supports both read and write access.
 *
 * @example
 * ```ts
 * options.display.max_rows;          // 60
 * options.display.max_rows = 20;
 * ```
 */
export const options: OptionsProxy = _makeProxy("");

// ─── Built-in options ─────────────────────────────────────────────────────────

function _posInt(name: string): OptionValidator {
  return (v): string | undefined =>
    typeof v === "number" && Number.isInteger(v) && v >= 0
      ? undefined
      : `${name} must be a non-negative integer`;
}

function _bool(name: string): OptionValidator {
  return (v): string | undefined =>
    typeof v === "boolean" ? undefined : `${name} must be a boolean`;
}

function _oneOf(name: string, choices: readonly OptionValue[]): OptionValidator {
  return (v): string | undefined =>
    choices.includes(v) ? undefined : `${name} must be one of: ${choices.map(String).join(", ")}`;
}

// display.*
registerOption(
  "display.max_rows",
  60,
  "Maximum number of rows to display.",
  _posInt("display.max_rows"),
);
registerOption(
  "display.min_rows",
  10,
  "Minimum rows displayed when the frame is truncated.",
  _posInt("display.min_rows"),
);
registerOption(
  "display.max_columns",
  20,
  "Maximum number of columns to display.",
  _posInt("display.max_columns"),
);
registerOption(
  "display.max_colwidth",
  50,
  "Maximum width of column values (characters) before truncation.",
  _posInt("display.max_colwidth"),
);
registerOption("display.width", 80, "Terminal width used for wrapping.", _posInt("display.width"));
registerOption(
  "display.precision",
  6,
  "Floating-point display precision (significant digits).",
  _posInt("display.precision"),
);
registerOption(
  "display.show_dimensions",
  true,
  "Whether to show DataFrame dimensions at the end of repr.",
  _bool("display.show_dimensions"),
);
registerOption(
  "display.unicode.east_asian_width",
  false,
  "Whether to account for east-Asian character widths.",
  _bool("display.unicode.east_asian_width"),
);
registerOption(
  "display.float_format",
  null,
  "Callable used to format floating-point values; null means use default repr.",
);
registerOption(
  "display.colheader_justify",
  "right",
  "Justify column headers: 'left' or 'right'.",
  _oneOf("display.colheader_justify", ["left", "right"]),
);

// mode.*
registerOption(
  "mode.chained_assignment",
  "warn",
  "Controls SettingWithCopyWarning: 'raise', 'warn', or null.",
  _oneOf("mode.chained_assignment", ["raise", "warn", null]),
);
registerOption(
  "mode.dtype_backend",
  "numpy",
  "Default dtype backend: 'numpy' or 'arrow'.",
  _oneOf("mode.dtype_backend", ["numpy", "arrow"]),
);
registerOption("mode.use_inf_as_na", false, "Treat infinity as NA.", _bool("mode.use_inf_as_na"));
registerOption(
  "mode.copy_on_write",
  false,
  "Enable copy-on-write semantics.",
  _bool("mode.copy_on_write"),
);

// compute.*
registerOption(
  "compute.use_bottleneck",
  false,
  "Use the bottleneck library for numeric operations.",
  _bool("compute.use_bottleneck"),
);
registerOption(
  "compute.use_numexpr",
  false,
  "Use numexpr for large array eval().",
  _bool("compute.use_numexpr"),
);
