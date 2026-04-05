import { beforeEach, describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  DataFrame,
  Series,
  areaPlot,
  barPlot,
  barhPlot,
  boxPlot,
  dfAreaPlot,
  dfBarPlot,
  dfBoxPlot,
  dfHistPlot,
  dfLinePlot,
  dfScatterPlot,
  histPlot,
  kdePlot,
  linePlot,
  piePlot,
  setPlotRenderer,
} from "../../src/index.ts";
import type { PlotSpec } from "../../src/index.ts";

// ─── fixture ──────────────────────────────────────────────────────────────────

function makeSeries(): Series {
  return new Series({ data: [1, 2, 3, 4, 5], index: ["a", "b", "c", "d", "e"], name: "vals" });
}

function makeDF(): DataFrame {
  return DataFrame.fromColumns({ x: [1, 2, 3], y: [4, 5, 6] });
}

// ─── renderer setup ───────────────────────────────────────────────────────────

describe("setPlotRenderer / emit", () => {
  beforeEach(() => setPlotRenderer(null));

  test("renderer receives spec when set", () => {
    const captured: PlotSpec[] = [];
    setPlotRenderer((spec) => captured.push(spec));
    linePlot(makeSeries());
    expect(captured.length).toBe(1);
    expect(captured[0]?.kind).toBe("line");
  });

  test("no-op when renderer is null", () => {
    // Should not throw
    const spec = linePlot(makeSeries());
    expect(spec.kind).toBe("line");
  });

  test("returns PlotSpec regardless of renderer", () => {
    const spec = barPlot(makeSeries(), { title: "Test" });
    expect(spec.options.title).toBe("Test");
  });

  test("clearing renderer with null works", () => {
    const captured: PlotSpec[] = [];
    setPlotRenderer((spec) => captured.push(spec));
    linePlot(makeSeries());
    setPlotRenderer(null);
    linePlot(makeSeries());
    expect(captured.length).toBe(1);
  });
});

// ─── Series plot functions ────────────────────────────────────────────────────

describe("Series plot functions", () => {
  beforeEach(() => setPlotRenderer(null));

  const s = makeSeries();

  test("linePlot returns correct kind and series", () => {
    const spec = linePlot(s);
    expect(spec.kind).toBe("line");
    expect(spec.series.length).toBe(1);
    expect(spec.series[0]?.name).toBe("vals");
    expect(spec.series[0]?.values).toEqual([1, 2, 3, 4, 5]);
  });

  test("barPlot", () => {
    expect(barPlot(s).kind).toBe("bar");
  });

  test("barhPlot", () => {
    expect(barhPlot(s).kind).toBe("barh");
  });

  test("areaPlot", () => {
    expect(areaPlot(s).kind).toBe("area");
  });

  test("histPlot with bins option", () => {
    const spec = histPlot(s, { bins: 20 });
    expect(spec.kind).toBe("hist");
    expect((spec.options as { bins?: number }).bins).toBe(20);
  });

  test("kdePlot", () => {
    expect(kdePlot(s).kind).toBe("kde");
  });

  test("boxPlot", () => {
    expect(boxPlot(s).kind).toBe("box");
  });

  test("piePlot", () => {
    expect(piePlot(s).kind).toBe("pie");
  });

  test("xData matches index", () => {
    const spec = linePlot(s);
    expect(spec.xData).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("unnamed series falls back to 'values'", () => {
    const unnamed = new Series({ data: [1, 2] });
    const spec = linePlot(unnamed);
    expect(spec.series[0]?.name).toBe("values");
  });
});

// ─── DataFrame plot functions ─────────────────────────────────────────────────

describe("DataFrame plot functions", () => {
  beforeEach(() => setPlotRenderer(null));

  const df = makeDF();

  test("dfLinePlot returns all columns as series", () => {
    const spec = dfLinePlot(df);
    expect(spec.kind).toBe("line");
    expect(spec.series.length).toBe(2);
    expect(spec.series.map((s) => s.name)).toEqual(["x", "y"]);
  });

  test("dfBarPlot", () => {
    expect(dfBarPlot(df).kind).toBe("bar");
  });

  test("dfAreaPlot", () => {
    expect(dfAreaPlot(df).kind).toBe("area");
  });

  test("dfBoxPlot", () => {
    expect(dfBoxPlot(df).kind).toBe("box");
  });

  test("dfScatterPlot", () => {
    expect(dfScatterPlot(df).kind).toBe("scatter");
  });

  test("dfHistPlot", () => {
    expect(dfHistPlot(df).kind).toBe("hist");
  });

  test("dfLinePlot xData has correct length", () => {
    const spec = dfLinePlot(df);
    expect(spec.xData.length).toBe(3);
  });
});

// ─── property tests ───────────────────────────────────────────────────────────

describe("property: plot specs are consistent", () => {
  test("series length equals input data length", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 50 }), (arr) => {
        setPlotRenderer(null);
        const s = new Series({ data: arr });
        const spec = linePlot(s);
        expect(spec.series[0]?.values.length).toBe(arr.length);
        expect(spec.xData.length).toBe(arr.length);
      }),
    );
  });
});
