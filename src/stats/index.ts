/**
 * Statistical functions for tsb.
 *
 * Re-exports all stats utilities: `describe`, `corr`, `cov`, skewness, and kurtosis.
 */

export { describe, describeDataFrame } from "./describe.ts";
export { corrSeries, corrDataFrame } from "./corr.ts";
export type { CorrMethod } from "./corr.ts";
export { covSeries, covDataFrame } from "./cov.ts";
export {
  skewSeries,
  skewDataFrame,
  kurtosisSeries,
  kurtSeries,
  kurtosisDataFrame,
  kurtDataFrame,
} from "./moments.ts";

// ─── linear algebra ───────────────────────────────────────────────────────────
export { dot, outer, vadd, vsub, vscale, norm, matmul, transpose, matvec, lstsq, det } from "./linear-algebra.ts";
export type { Vector, Matrix, LstsqResult } from "./linear-algebra.ts";

// ─── hypothesis testing ───────────────────────────────────────────────────────
export { ttest1samp, ttestInd, ttestRel, chi2test, kstest, ztest } from "./hypothesis.ts";
export type { TestResult } from "./hypothesis.ts";
