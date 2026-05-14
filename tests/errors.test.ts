/**
 * Tests for pd.errors — pandas-compatible error and warning classes.
 */
import { describe, expect, test } from "bun:test";
import {
  AbstractMethodError,
  AccessorRegistrationWarning,
  AttributeConflictWarning,
  CSSWarning,
  ChainedAssignmentError,
  DataError,
  DatabaseError,
  DtypeWarning,
  EmptyDataError,
  IndexError,
  IntCastingNaNError,
  InvalidColumnName,
  InvalidComparison,
  InvalidIndexError,
  InvalidUseOfBooleanIndex,
  InvalidVersion,
  KeyError,
  LossySetitemError,
  MergeError,
  NullFrequencyError,
  NumbaUtilError,
  OptionError,
  OutOfBoundsDatetime,
  OutOfBoundsTimedelta,
  ParserError,
  ParserWarning,
  PerformanceWarning,
  PossibleDataLossError,
  PossiblePrecisionLoss,
  SpecificationError,
  UnsortedIndexError,
  UnsupportedFunctionCall,
  ValueError,
  ValueLabelTypeMismatch,
  errors,
} from "../src/index.ts";

// ---------------------------------------------------------------------------
// Helper: assert that a class is throwable and catchable
// ---------------------------------------------------------------------------
function assertThrowable<T extends Error, A extends unknown[]>(
  Cls: new (...args: A) => T,
  args: A,
  expectedMessage?: string,
): void {
  const instance = new Cls(...args);
  expect(instance).toBeInstanceOf(Error);
  expect(instance).toBeInstanceOf(Cls);
  if (expectedMessage !== undefined) {
    expect(instance.message).toBe(expectedMessage);
  }
  // Verify it can be caught with instanceof
  let caught: unknown;
  try {
    throw instance;
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(Cls);
}

// ---------------------------------------------------------------------------
// Base classes
// ---------------------------------------------------------------------------

describe("ValueError", () => {
  test("is a TypeError", () => {
    const e = new ValueError("bad value");
    expect(e).toBeInstanceOf(TypeError);
    expect(e).toBeInstanceOf(ValueError);
    expect(e.name).toBe("ValueError");
    expect(e.message).toBe("bad value");
  });
});

describe("KeyError", () => {
  test("is an Error", () => {
    const e = new KeyError("missing key");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("KeyError");
    expect(e.message).toBe("missing key");
  });
});

describe("IndexError", () => {
  test("is a RangeError", () => {
    const e = new IndexError("out of bounds");
    expect(e).toBeInstanceOf(RangeError);
    expect(e.name).toBe("IndexError");
  });
});

// ---------------------------------------------------------------------------
// All error classes
// ---------------------------------------------------------------------------

describe("AbstractMethodError", () => {
  test("message includes class name", () => {
    const e = new AbstractMethodError("MyClass.myMethod");
    expect(e.message).toContain("MyClass.myMethod");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("AbstractMethodError");
  });
  test("instanceof check works", () => assertThrowable(AbstractMethodError, ["Foo"]));
});

describe("AccessorRegistrationWarning", () => {
  test("throwable", () => {
    const e = new AccessorRegistrationWarning("shadowing built-in");
    expect(e.name).toBe("AccessorRegistrationWarning");
    expect(e.message).toBe("shadowing built-in");
  });
});

describe("AttributeConflictWarning", () => {
  test("throwable", () => assertThrowable(AttributeConflictWarning, ["conflict"]));
});

describe("CSSWarning", () => {
  test("name is CSSWarning", () => {
    expect(new CSSWarning("bad CSS").name).toBe("CSSWarning");
  });
});

describe("ChainedAssignmentError", () => {
  test("default message", () => {
    const e = new ChainedAssignmentError();
    expect(e.message).toContain("copy of a slice");
    expect(e.name).toBe("ChainedAssignmentError");
  });
  test("custom message", () => {
    const e = new ChainedAssignmentError("custom");
    expect(e.message).toBe("custom");
  });
});

describe("DatabaseError", () => {
  test("throwable", () => assertThrowable(DatabaseError, ["DB error"]));
});

describe("DataError", () => {
  test("throwable", () => assertThrowable(DataError, ["data error"]));
});

describe("DtypeWarning", () => {
  test("throwable", () => assertThrowable(DtypeWarning, ["dtype warning"]));
});

describe("EmptyDataError", () => {
  test("default message", () => {
    expect(new EmptyDataError().message).toContain("No columns");
  });
  test("custom message", () => {
    const e = new EmptyDataError("custom");
    expect(e.message).toBe("custom");
  });
  test("instanceof", () => assertThrowable(EmptyDataError, []));
});

describe("IntCastingNaNError", () => {
  test("default message", () => {
    expect(new IntCastingNaNError().message).toContain("non-finite");
  });
  test("instanceof", () => assertThrowable(IntCastingNaNError, []));
});

describe("InvalidColumnName", () => {
  test("throwable", () => assertThrowable(InvalidColumnName, ["bad col"]));
});

describe("InvalidComparison", () => {
  test("is TypeError", () => {
    const e = new InvalidComparison("bad compare");
    expect(e).toBeInstanceOf(TypeError);
    expect(e.name).toBe("InvalidComparison");
  });
});

describe("InvalidIndexError", () => {
  test("default message", () => {
    expect(new InvalidIndexError().message).toContain("label not found");
  });
  test("instanceof", () => assertThrowable(InvalidIndexError, []));
});

describe("InvalidUseOfBooleanIndex", () => {
  test("is IndexError", () => {
    const e = new InvalidUseOfBooleanIndex("bad bool");
    expect(e).toBeInstanceOf(IndexError);
    expect(e.name).toBe("InvalidUseOfBooleanIndex");
  });
});

describe("InvalidVersion", () => {
  test("is ValueError", () => {
    const e = new InvalidVersion("bad ver");
    expect(e).toBeInstanceOf(ValueError);
    expect(e.name).toBe("InvalidVersion");
  });
});

describe("LossySetitemError", () => {
  test("throwable", () => assertThrowable(LossySetitemError, ["lossy"]));
});

describe("MergeError", () => {
  test("is ValueError", () => {
    const e = new MergeError("merge fail");
    expect(e).toBeInstanceOf(ValueError);
    expect(e.name).toBe("MergeError");
  });
});

describe("NullFrequencyError", () => {
  test("default message", () => {
    expect(new NullFrequencyError().message).toContain("null frequency");
  });
  test("is ValueError", () => {
    expect(new NullFrequencyError()).toBeInstanceOf(ValueError);
  });
});

describe("NumbaUtilError", () => {
  test("throwable", () => assertThrowable(NumbaUtilError, ["numba"]));
});

describe("OptionError", () => {
  test("is KeyError", () => {
    const e = new OptionError("bad option");
    expect(e).toBeInstanceOf(KeyError);
    expect(e.name).toBe("OptionError");
  });
});

describe("OutOfBoundsDatetime", () => {
  test("default message", () => {
    expect(new OutOfBoundsDatetime().message).toContain("nanosecond");
  });
  test("is ValueError", () => {
    expect(new OutOfBoundsDatetime()).toBeInstanceOf(ValueError);
  });
});

describe("OutOfBoundsTimedelta", () => {
  test("default message", () => {
    expect(new OutOfBoundsTimedelta().message).toContain("timedelta");
  });
  test("is ValueError", () => {
    expect(new OutOfBoundsTimedelta()).toBeInstanceOf(ValueError);
  });
});

describe("ParserError", () => {
  test("is ValueError", () => {
    const e = new ParserError("parse fail");
    expect(e).toBeInstanceOf(ValueError);
    expect(e.name).toBe("ParserError");
  });
});

describe("ParserWarning", () => {
  test("throwable", () => assertThrowable(ParserWarning, ["fallback parser"]));
});

describe("PerformanceWarning", () => {
  test("throwable", () => assertThrowable(PerformanceWarning, ["slow op"]));
});

describe("PossibleDataLossError", () => {
  test("throwable", () => assertThrowable(PossibleDataLossError, ["data loss"]));
});

describe("PossiblePrecisionLoss", () => {
  test("throwable", () => assertThrowable(PossiblePrecisionLoss, ["precision loss"]));
});

describe("SpecificationError", () => {
  test("is ValueError", () => {
    expect(new SpecificationError("bad spec")).toBeInstanceOf(ValueError);
    expect(new SpecificationError("bad spec").name).toBe("SpecificationError");
  });
});

describe("UnsortedIndexError", () => {
  test("default message", () => {
    expect(new UnsortedIndexError().message).toContain("lexsorted");
  });
  test("is KeyError", () => {
    expect(new UnsortedIndexError()).toBeInstanceOf(KeyError);
  });
});

describe("UnsupportedFunctionCall", () => {
  test("is ValueError", () => {
    expect(new UnsupportedFunctionCall("no fn")).toBeInstanceOf(ValueError);
  });
});

describe("ValueLabelTypeMismatch", () => {
  test("throwable", () => assertThrowable(ValueLabelTypeMismatch, ["mismatch"]));
});

// ---------------------------------------------------------------------------
// errors namespace
// ---------------------------------------------------------------------------

describe("errors namespace", () => {
  test("contains all classes", () => {
    expect(errors.AbstractMethodError).toBe(AbstractMethodError);
    expect(errors.EmptyDataError).toBe(EmptyDataError);
    expect(errors.MergeError).toBe(MergeError);
    expect(errors.ParserError).toBe(ParserError);
    expect(errors.ValueError).toBe(ValueError);
    expect(errors.KeyError).toBe(KeyError);
    expect(errors.IndexError).toBe(IndexError);
  });

  test("all namespace entries are constructors", () => {
    const errorKeys = Object.keys(errors) as Array<keyof typeof errors>;
    for (const key of errorKeys) {
      const Cls = errors[key];
      const instance = new Cls(key as never);
      expect(instance).toBeInstanceOf(Error);
    }
  });
});
