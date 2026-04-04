/**
 * Tests for DataFrame.
 *
 * Covers: construction, shape, column access, slicing (head/tail/iloc/loc),
 * column mutations (assign/drop/select/rename), missing-value handling,
 * filter, aggregations (sum/mean/min/max/std/count/describe),
 * sorting (sortValues/sortIndex), apply, iteration (iterrows/iteritems/items),
 * conversion (toRecords/toDict/toArray), and index manipulation (resetIndex/setIndex).
 */
import { describe, expect, it } from "bun:test";
import { DataFrame, Index, Series } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSimple(): DataFrame {
  return DataFrame.fromColumns({
    name: ["Alice", "Bob", "Carol"],
    age: [30, 25, 35],
    score: [90, 80, 95],
  });
}

function makeWithNulls(): DataFrame {
  return DataFrame.fromColumns({
    a: [1, null, 3],
    b: [null, 5, 6],
  });
}

// ─── construction ─────────────────────────────────────────────────────────────

describe("DataFrame", () => {
  describe("fromColumns", () => {
    it("creates from column arrays", () => {
      const df = makeSimple();
      expect(df.shape).toEqual([3, 3]);
      expect(df.ndim).toBe(2);
    });

    it("empty DataFrame has shape [0, 0]", () => {
      const df = DataFrame.fromColumns({});
      expect(df.shape).toEqual([0, 0]);
      expect(df.empty).toBe(true);
    });

    it("accepts a custom row index", () => {
      const df = DataFrame.fromColumns({ x: [10, 20] }, { index: ["r0", "r1"] });
      expect(df.index.at(0)).toBe("r0");
      expect(df.index.at(1)).toBe("r1");
    });

    it("accepts Index object as row index", () => {
      const idx = new Index<number | string>(["a", "b", "c"]);
      const df = DataFrame.fromColumns({ v: [1, 2, 3] }, { index: idx });
      expect(df.index.size).toBe(3);
    });
  });

  describe("fromRecords", () => {
    it("creates from array of row objects", () => {
      const df = DataFrame.fromRecords([
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ]);
      expect(df.shape).toEqual([2, 2]);
      expect(df.col("name").at(0)).toBe("Alice");
    });

    it("empty records → empty DataFrame", () => {
      const df = DataFrame.fromRecords([]);
      expect(df.empty).toBe(true);
    });

    it("handles missing keys in rows (fills null)", () => {
      const df = DataFrame.fromRecords([
        { a: 1, b: 2 },
        { a: 3, b: null },
      ]);
      expect(df.col("b").at(1)).toBeNull();
    });
  });

  describe("from2D", () => {
    it("creates from 2-D array", () => {
      const df = DataFrame.from2D(
        [
          [1, 4],
          [2, 5],
          [3, 6],
        ],
        ["a", "b"],
      );
      expect(df.shape).toEqual([3, 2]);
      expect(df.col("a").at(0)).toBe(1);
      expect(df.col("b").at(2)).toBe(6);
    });
  });

  // ─── shape properties ───────────────────────────────────────────────────────

  describe("shape properties", () => {
    it("shape returns [nRows, nCols]", () => expect(makeSimple().shape).toEqual([3, 3]));
    it("ndim is always 2", () => expect(makeSimple().ndim).toBe(2));
    it("size is nRows * nCols", () => expect(makeSimple().size).toBe(9));
    it("empty is false for non-empty DataFrame", () => expect(makeSimple().empty).toBe(false));
    it("empty is true for 0-row DataFrame", () => {
      expect(DataFrame.fromColumns({ a: [] }).empty).toBe(true);
    });
  });

  // ─── column access ───────────────────────────────────────────────────────────

  describe("column access", () => {
    it("col returns the Series", () => {
      const s = makeSimple().col("age");
      expect(s).toBeInstanceOf(Series);
      expect(s.size).toBe(3);
    });

    it("col throws for missing column", () => {
      expect(() => makeSimple().col("missing")).toThrow(RangeError);
    });

    it("get returns undefined for missing column", () => {
      expect(makeSimple().get("missing")).toBeUndefined();
    });

    it("has returns true/false correctly", () => {
      const df = makeSimple();
      expect(df.has("age")).toBe(true);
      expect(df.has("nope")).toBe(false);
    });

    it("columns index matches fromColumns key order", () => {
      const df = makeSimple();
      expect(df.columns.values).toEqual(["name", "age", "score"]);
    });
  });

  // ─── slicing ─────────────────────────────────────────────────────────────────

  describe("head / tail", () => {
    it("head(2) returns first 2 rows", () => {
      const df = makeSimple().head(2);
      expect(df.shape).toEqual([2, 3]);
      expect(df.col("name").at(0)).toBe("Alice");
    });

    it("head with n > size returns all rows", () => {
      expect(makeSimple().head(100).shape[0]).toBe(3);
    });

    it("tail(1) returns last row", () => {
      const df = makeSimple().tail(1);
      expect(df.shape).toEqual([1, 3]);
      expect(df.col("name").at(0)).toBe("Carol");
    });
  });

  describe("iloc", () => {
    it("selects rows by integer positions", () => {
      const df = makeSimple().iloc([0, 2]);
      expect(df.shape).toEqual([2, 3]);
      expect(df.col("name").at(0)).toBe("Alice");
      expect(df.col("name").at(1)).toBe("Carol");
    });
  });

  describe("loc", () => {
    it("selects rows by row-index labels", () => {
      const df = DataFrame.fromColumns({ v: [10, 20, 30] }, { index: ["a", "b", "c"] });
      const sliced = df.loc(["a", "c"]);
      expect(sliced.shape).toEqual([2, 1]);
      expect(sliced.col("v").at(0)).toBe(10);
      expect(sliced.col("v").at(1)).toBe(30);
    });
  });

  // ─── column mutations ────────────────────────────────────────────────────────

  describe("assign", () => {
    it("adds a new column from array", () => {
      const df = makeSimple().assign({ bonus: [1, 2, 3] });
      expect(df.has("bonus")).toBe(true);
      expect(df.shape[1]).toBe(4);
    });

    it("replaces an existing column from Series", () => {
      const df = makeSimple();
      const newAge = new Series({ data: [31, 26, 36] });
      const df2 = df.assign({ age: newAge });
      expect(df2.col("age").at(0)).toBe(31);
    });
  });

  describe("drop", () => {
    it("drops specified columns", () => {
      const df = makeSimple().drop(["score", "name"]);
      expect(df.columns.values).toEqual(["age"]);
    });

    it("original DataFrame is unchanged", () => {
      const df = makeSimple();
      df.drop(["age"]);
      expect(df.has("age")).toBe(true);
    });
  });

  describe("select", () => {
    it("selects columns in specified order", () => {
      const df = makeSimple().select(["score", "name"]);
      expect(df.columns.values).toEqual(["score", "name"]);
    });

    it("throws for missing column", () => {
      expect(() => makeSimple().select(["nope"])).toThrow(RangeError);
    });
  });

  describe("rename", () => {
    it("renames a column", () => {
      const df = makeSimple().rename({ age: "years" });
      expect(df.has("years")).toBe(true);
      expect(df.has("age")).toBe(false);
    });
  });

  // ─── missing values ───────────────────────────────────────────────────────────

  describe("isna / notna", () => {
    it("isna marks null values as true", () => {
      const df = makeWithNulls().isna();
      expect(df.col("a").at(0)).toBe(false);
      expect(df.col("a").at(1)).toBe(true);
    });

    it("notna is the inverse of isna", () => {
      const df = makeWithNulls().notna();
      expect(df.col("a").at(0)).toBe(true);
      expect(df.col("a").at(1)).toBe(false);
    });
  });

  describe("dropna", () => {
    it("drops rows with any null", () => {
      const df = makeWithNulls().dropna();
      expect(df.shape[0]).toBe(1);
      expect(df.col("a").at(0)).toBe(3);
    });
  });

  describe("fillna", () => {
    it("fills null values with scalar", () => {
      const df = makeWithNulls().fillna(0);
      expect(df.col("a").at(1)).toBe(0);
      expect(df.col("b").at(0)).toBe(0);
    });
  });

  // ─── filter ───────────────────────────────────────────────────────────────────

  describe("filter", () => {
    it("filters rows by boolean array", () => {
      const df = makeSimple().filter([true, false, true]);
      expect(df.shape[0]).toBe(2);
      expect(df.col("name").at(0)).toBe("Alice");
      expect(df.col("name").at(1)).toBe("Carol");
    });
  });

  // ─── aggregations ─────────────────────────────────────────────────────────────

  describe("sum / mean / min / max / std / count", () => {
    it("sum aggregates columns", () => {
      const s = makeSimple().sum();
      expect(s.at("age")).toBe(90);
    });

    it("mean aggregates columns", () => {
      const s = makeSimple().mean();
      expect(s.at("age")).toBe(30);
    });

    it("min aggregates columns", () => {
      const s = makeSimple().min();
      expect(s.at("age")).toBe(25);
    });

    it("max aggregates columns", () => {
      const s = makeSimple().max();
      expect(s.at("age")).toBe(35);
    });

    it("count returns non-null count", () => {
      const s = makeWithNulls().count();
      expect(s.at("a")).toBe(2);
      expect(s.at("b")).toBe(2);
    });
  });

  describe("describe", () => {
    it("returns count/mean/std/min/max for numeric columns", () => {
      const desc = makeSimple().describe();
      expect(desc.index.values).toEqual(["count", "mean", "std", "min", "max"]);
      expect(desc.col("age").at("count")).toBe(3);
      expect(desc.col("age").at("mean")).toBe(30);
      expect(desc.col("age").at("min")).toBe(25);
      expect(desc.col("age").at("max")).toBe(35);
    });
  });

  // ─── sorting ──────────────────────────────────────────────────────────────────

  describe("sortValues", () => {
    it("sorts ascending by a column", () => {
      const df = makeSimple().sortValues("age");
      expect(df.col("name").at(0)).toBe("Bob");
      expect(df.col("name").at(2)).toBe("Carol");
    });

    it("sorts descending by a column", () => {
      const df = makeSimple().sortValues("age", false);
      expect(df.col("name").at(0)).toBe("Carol");
    });

    it("sorts by multiple columns", () => {
      const df = DataFrame.fromColumns({
        g: ["a", "a", "b", "b"],
        v: [2, 1, 4, 3],
      });
      const sorted = df.sortValues(["g", "v"]);
      expect(sorted.col("v").at(0)).toBe(1);
      expect(sorted.col("v").at(1)).toBe(2);
    });
  });

  describe("sortIndex", () => {
    it("sorts by row index ascending", () => {
      const df = DataFrame.fromColumns({ v: [10, 20, 30] }, { index: ["c", "a", "b"] });
      const sorted = df.sortIndex();
      expect(sorted.index.at(0)).toBe("a");
      expect(sorted.col("v").at(0)).toBe(20);
    });
  });

  // ─── apply ────────────────────────────────────────────────────────────────────

  describe("apply", () => {
    it("axis=0 applies fn to each column", () => {
      const result = makeSimple().apply((s) => s.sum(), 0);
      expect(result.at("age")).toBe(90);
    });

    it("axis=1 applies fn to each row", () => {
      const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6] });
      const result = df.apply((s) => s.sum(), 1);
      expect(result.at(0)).toBe(5);
      expect(result.at(1)).toBe(7);
    });
  });

  // ─── iteration ────────────────────────────────────────────────────────────────

  describe("iteritems / items", () => {
    it("yields [name, Series] pairs for each column", () => {
      const df = makeSimple();
      const pairs: string[] = [];
      for (const [name] of df.items()) {
        pairs.push(name);
      }
      expect(pairs).toEqual(["name", "age", "score"]);
    });
  });

  describe("iterrows", () => {
    it("yields [label, Series] pairs for each row", () => {
      const df = DataFrame.fromColumns({ a: [10, 20] });
      const rows: [unknown, unknown][] = [];
      for (const [label, row] of df.iterrows()) {
        rows.push([label, row.at("a")]);
      }
      expect(rows[0]).toEqual([0, 10]);
      expect(rows[1]).toEqual([1, 20]);
    });
  });

  // ─── conversion ───────────────────────────────────────────────────────────────

  describe("toRecords", () => {
    it("converts to array of row objects", () => {
      const records = makeSimple().toRecords();
      expect(records.length).toBe(3);
      expect(records[0]).toEqual({ name: "Alice", age: 30, score: 90 });
    });
  });

  describe("toDict", () => {
    it("converts to column-keyed object", () => {
      const d = makeSimple().toDict();
      expect(d).toEqual({
        name: ["Alice", "Bob", "Carol"],
        age: [30, 25, 35],
        score: [90, 80, 95],
      });
    });
  });

  describe("toArray", () => {
    it("converts to 2-D array", () => {
      const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
      expect(df.toArray()).toEqual([
        [1, 3],
        [2, 4],
      ]);
    });
  });

  // ─── index manipulation ───────────────────────────────────────────────────────

  describe("resetIndex", () => {
    it("resets index to RangeIndex and adds old index as column", () => {
      const df = DataFrame.fromColumns({ v: [10, 20] }, { index: ["a", "b"] });
      const reset = df.resetIndex();
      expect(reset.index.at(0)).toBe(0);
      expect(reset.has("index")).toBe(true);
      expect(reset.col("index").at(0)).toBe("a");
    });

    it("drop=true discards the old index column", () => {
      const df = DataFrame.fromColumns({ v: [10, 20] }, { index: ["a", "b"] });
      const reset = df.resetIndex(true);
      expect(reset.has("index")).toBe(false);
    });
  });

  describe("setIndex", () => {
    it("promotes a column to the row index", () => {
      const df = makeSimple().setIndex("name");
      expect(df.index.at(0)).toBe("Alice");
      expect(df.has("name")).toBe(false);
    });

    it("drop=false keeps the column", () => {
      const df = makeSimple().setIndex("name", false);
      expect(df.index.at(0)).toBe("Alice");
      expect(df.has("name")).toBe(true);
    });

    it("throws for non-existent column", () => {
      expect(() => makeSimple().setIndex("nope")).toThrow(RangeError);
    });
  });

  // ─── toString ─────────────────────────────────────────────────────────────────

  describe("toString", () => {
    it("returns a non-empty string", () => {
      const s = makeSimple().toString();
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
      expect(s).toContain("Alice");
      expect(s).toContain("age");
    });
  });
});
