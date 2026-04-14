import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  dataFramePipe,
  dataFramePipeChain,
  dataFramePipeTo,
  pipeChain,
  pipeSeries,
  pipeTo,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSeries(data: Scalar[]): Series<Scalar> {
  return new Series({ data });
}

function makeDataFrame(cols: Record<string, Scalar[]>): DataFrame {
  return DataFrame.fromColumns(cols);
}

// ─── pipeSeries ───────────────────────────────────────────────────────────────

describe("pipeSeries — basic usage", () => {
  const s = makeSeries([1, 2, 3, 4]);

  test("identity function returns same series", () => {
    const r = pipeSeries(s, (x) => x);
    expect(r).toBe(s);
  });

  test("returns result of fn", () => {
    const r = pipeSeries(s, (x) => x.size);
    expect(r).toBe(4);
  });

  test("passes extra args to fn", () => {
    const r = pipeSeries(s, (x, n: number) => x.size + n, 10);
    expect(r).toBe(14);
  });

  test("passes multiple extra args", () => {
    const r = pipeSeries(s, (x, a: number, b: number) => x.size + a + b, 5, 3);
    expect(r).toBe(12);
  });

  test("fn can return a new Series", () => {
    const doubled = pipeSeries(s, (x) => {
      return new Series({ data: x.values.map((v) => (v as number) * 2) as Scalar[] });
    });
    expect([...doubled.values]).toEqual([2, 4, 6, 8]);
  });

  test("fn can return string", () => {
    const r = pipeSeries(s, () => "hello");
    expect(r).toBe("hello");
  });

  test("fn can return null", () => {
    const r = pipeSeries(s, () => null);
    expect(r).toBeNull();
  });

  test("works on empty series", () => {
    const empty = makeSeries([]);
    const r = pipeSeries(empty, (x) => x.size);
    expect(r).toBe(0);
  });

  test("series is passed as first arg, not a copy", () => {
    let received: Series<Scalar> | null = null;
    pipeSeries(s, (x) => {
      received = x;
      return x;
    });
    if (received === null) {
      throw new Error("Expected callback to receive series");
    }
    expect(received === s).toBe(true);
  });
});

describe("pipeSeries — composition", () => {
  const s = makeSeries([10, 20, 30]);

  test("nested pipes compose correctly", () => {
    const addOne = (x: Series<Scalar>) =>
      new Series({ data: x.values.map((v) => (v as number) + 1) as Scalar[] });
    const double = (x: Series<Scalar>) =>
      new Series({ data: x.values.map((v) => (v as number) * 2) as Scalar[] });

    const r1 = pipeSeries(pipeSeries(s, addOne), double);
    const r2 = pipeSeries(s, (x) => double(addOne(x)));
    expect([...r1.values]).toEqual([...r2.values]);
  });
});

describe("pipeSeries — property tests", () => {
  test("identity law: pipe(s, id) returns same reference", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -100, max: 100 }), { maxLength: 20 }), (data) => {
        const s = makeSeries(data as Scalar[]);
        const r = pipeSeries(s, (x) => x);
        return r === s;
      }),
    );
  });

  test("result equals fn(s)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -100, max: 100 }), { maxLength: 20 }), (data) => {
        const s = makeSeries(data as Scalar[]);
        const fn = (x: Series<Scalar>) => x.size;
        return pipeSeries(s, fn) === fn(s);
      }),
    );
  });

  test("extra args are forwarded unchanged", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 20 }), fc.integer(), (data, extra) => {
        const s = makeSeries(data as Scalar[]);
        const r = pipeSeries(s, (_x, n: number) => n, extra);
        return r === extra;
      }),
    );
  });
});

// ─── dataFramePipe ────────────────────────────────────────────────────────────

describe("dataFramePipe — basic usage", () => {
  const df = makeDataFrame({ a: [1, 2, 3], b: [4, 5, 6] });

  test("identity function returns same df reference", () => {
    const r = dataFramePipe(df, (d) => d);
    expect(r).toBe(df);
  });

  test("returns fn result (shape)", () => {
    const r = dataFramePipe(df, (d) => d.shape);
    expect(r).toEqual([3, 2]);
  });

  test("passes extra args", () => {
    const r = dataFramePipe(df, (d, n: number) => d.shape[0] + n, 100);
    expect(r).toBe(103);
  });

  test("fn receives the df as first arg", () => {
    let received: DataFrame | null = null;
    dataFramePipe(df, (d) => {
      received = d;
      return d;
    });
    if (received === null) {
      throw new Error("Expected callback to receive dataframe");
    }
    expect(received === df).toBe(true);
  });

  test("fn can return a new DataFrame", () => {
    const result = dataFramePipe(df, (d) => d.head(2));
    expect(result.shape[0]).toBe(2);
  });

  test("works on empty DataFrame", () => {
    const empty = makeDataFrame({});
    const r = dataFramePipe(empty, (d) => d.shape[1]);
    expect(r).toBe(0);
  });
});

describe("dataFramePipe — property tests", () => {
  test("identity law", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 20 }), (data) => {
        const df = makeDataFrame({ x: data as Scalar[] });
        const r = dataFramePipe(df, (d) => d);
        return r === df;
      }),
    );
  });

  test("result matches fn(df)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 20 }), (data) => {
        const df = makeDataFrame({ x: data as Scalar[] });
        const fn = (d: DataFrame) => d.shape[0];
        return dataFramePipe(df, fn) === fn(df);
      }),
    );
  });
});

// ─── pipeTo ───────────────────────────────────────────────────────────────────

describe("pipeTo — inserts series at given position", () => {
  const s = makeSeries([1, 2, 3]);

  test("pos=0 behaves like pipeSeries", () => {
    const r = pipeTo(s, 0, (x: unknown) => (x as Series<Scalar>).size);
    expect(r).toBe(3);
  });

  test("pos=1 inserts series as second argument", () => {
    const r = pipeTo(s, 1, (a: unknown, b: unknown) => [a, b], "first");
    expect(r).toEqual(["first", s]);
  });

  test("pos=2 inserts series as third argument", () => {
    const r = pipeTo(s, 2, (a: unknown, b: unknown, c: unknown) => [a, b, c], "x", "y");
    expect(r).toEqual(["x", "y", s]);
  });

  test("pos beyond args appends at end", () => {
    const r = pipeTo(s, 99, (a: unknown, b: unknown) => [a, b], "only");
    expect(r).toEqual(["only", s]);
  });
});

// ─── dataFramePipeTo ──────────────────────────────────────────────────────────

describe("dataFramePipeTo — inserts df at given position", () => {
  const df = makeDataFrame({ a: [1, 2] });

  test("pos=0 behaves like dataFramePipe", () => {
    const r = dataFramePipeTo(df, 0, (d: unknown) => (d as DataFrame).shape[1]);
    expect(r).toBe(1);
  });

  test("pos=1 inserts df as second argument", () => {
    const r = dataFramePipeTo(df, 1, (a: unknown, b: unknown) => [a, b], "left");
    expect(r).toEqual(["left", df]);
  });
});

// ─── pipeChain ────────────────────────────────────────────────────────────────

describe("pipeChain — chains multiple Series transforms", () => {
  const s = makeSeries([1, 2, 3, 4]);

  const addOne = (x: Series<Scalar>): Series<Scalar> =>
    new Series({ data: x.values.map((v) => (v as number) + 1) as Scalar[] });
  const double = (x: Series<Scalar>): Series<Scalar> =>
    new Series({ data: x.values.map((v) => (v as number) * 2) as Scalar[] });
  const square = (x: Series<Scalar>): Series<Scalar> =>
    new Series({ data: x.values.map((v) => (v as number) ** 2) as Scalar[] });

  test("zero transforms returns original series", () => {
    const r = pipeChain(s);
    expect(r).toBe(s);
  });

  test("single transform", () => {
    const r = pipeChain(s, addOne);
    expect([...r.values]).toEqual([2, 3, 4, 5]);
  });

  test("two transforms applied left-to-right", () => {
    const r = pipeChain(s, addOne, double);
    expect([...r.values]).toEqual([4, 6, 8, 10]);
  });

  test("three transforms", () => {
    const r = pipeChain(s, addOne, double, square);
    expect([...r.values]).toEqual([16, 36, 64, 100]);
  });

  test("order matters (double then addOne ≠ addOne then double)", () => {
    const r1 = pipeChain(s, double, addOne);
    const r2 = pipeChain(s, addOne, double);
    expect([...r1.values]).toEqual([3, 5, 7, 9]);
    expect([...r2.values]).toEqual([4, 6, 8, 10]);
  });

  test("works on empty series", () => {
    const empty = makeSeries([]);
    const r = pipeChain(empty, addOne, double);
    expect(r.size).toBe(0);
  });
});

describe("pipeChain — property tests", () => {
  const id = (x: Series<Scalar>): Series<Scalar> => x;

  test("identity chain returns same reference", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 20 }), (data) => {
        const s = makeSeries(data as Scalar[]);
        const r = pipeChain(s, id, id, id);
        return r === s;
      }),
    );
  });

  test("composition law: chain(f,g) === g(f(x))", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -50, max: 50 }), { maxLength: 20 }), (data) => {
        const s = makeSeries(data as Scalar[]);
        const f = (x: Series<Scalar>): Series<Scalar> =>
          new Series({ data: x.values.map((v) => (v as number) + 1) as Scalar[] });
        const g = (x: Series<Scalar>): Series<Scalar> =>
          new Series({ data: x.values.map((v) => (v as number) * 2) as Scalar[] });

        const chained = pipeChain(s, f, g);
        const composed = g(f(s));

        return [...chained.values].every((v, i) => v === [...composed.values][i]);
      }),
    );
  });
});

// ─── dataFramePipeChain ───────────────────────────────────────────────────────

describe("dataFramePipeChain — chains multiple DataFrame transforms", () => {
  const df = makeDataFrame({ a: [1, 2, 3, 4, 5], b: [10, 20, 30, 40, 50] });

  const head3 = (d: DataFrame): DataFrame => d.head(3);
  const tail2 = (d: DataFrame): DataFrame => d.tail(2);

  test("zero transforms returns original df", () => {
    const r = dataFramePipeChain(df);
    expect(r).toBe(df);
  });

  test("single transform", () => {
    const r = dataFramePipeChain(df, head3);
    expect(r.shape[0]).toBe(3);
  });

  test("two transforms applied left-to-right", () => {
    const r = dataFramePipeChain(df, head3, tail2);
    expect(r.shape[0]).toBe(2);
  });

  test("result matches manual nesting", () => {
    const r = dataFramePipeChain(df, head3, tail2);
    const manual = tail2(head3(df));
    expect(r.toRecords()).toEqual(manual.toRecords());
  });

  test("works on empty DataFrame", () => {
    const empty = makeDataFrame({ x: [] });
    const r = dataFramePipeChain(empty, (d) => d);
    expect(r).toBe(empty);
  });
});

describe("dataFramePipeChain — property tests", () => {
  const id = (d: DataFrame): DataFrame => d;

  test("identity chain returns same reference", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 20 }), (data) => {
        const df = makeDataFrame({ x: data as Scalar[] });
        const r = dataFramePipeChain(df, id, id);
        return r === df;
      }),
    );
  });

  test("composition law: chain(f,g)(df) === g(f(df))", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 5, maxLength: 20 }),
        (data) => {
          const df = makeDataFrame({ x: data as Scalar[] });
          const f = (d: DataFrame): DataFrame => d.head(Math.max(1, d.shape[0] - 1));
          const g = (d: DataFrame): DataFrame => d.head(Math.max(1, d.shape[0] - 1));

          const chained = dataFramePipeChain(df, f, g);
          const composed = g(f(df));

          return chained.shape[0] === composed.shape[0];
        },
      ),
    );
  });
});
