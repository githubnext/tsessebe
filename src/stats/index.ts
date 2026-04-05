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

// ─── pairwise statistics ──────────────────────────────────────────────────────
export { pairwiseCorr, pairwiseCov, corrwith, rollingCorr, rollCov } from "./pairwise.ts";
export type { RollingPairwiseOptions } from "./pairwise.ts";

// ─── bootstrap ────────────────────────────────────────────────────────────────
export { bootstrapCI, bootstrapMean, bootstrapMedian, bootstrapStd } from "./bootstrap.ts";
export type { BootstrapOptions, BootstrapResult } from "./bootstrap.ts";

// ─── contingency ──────────────────────────────────────────────────────────────
export { contingencyTable, chi2Contingency, fisherExact } from "./contingency.ts";
export type { Chi2Result, FisherResult } from "./contingency.ts";

// ─── anova ────────────────────────────────────────────────────────────────────
export { oneWayAnova, twoWayAnova } from "./anova.ts";
export type { AnovaRow, OneWayAnovaResult, TwoWayAnovaResult, TwoWayAnovaOptions } from "./anova.ts";

// ─── kruskal / friedman ───────────────────────────────────────────────────────
export { kruskalWallis, friedmanTest } from "./kruskal.ts";
export type { KruskalResult } from "./kruskal.ts";

// ─── mann-whitney / wilcoxon ──────────────────────────────────────────────────
export { mannWhitneyU, wilcoxonSigned } from "./mann_whitney.ts";
export type { MannWhitneyResult, WilcoxonResult } from "./mann_whitney.ts";

// ─── regression ───────────────────────────────────────────────────────────────
export { olsRegress, wlsRegress } from "./regression.ts";
export type { RegressionResult } from "./regression.ts";

// ─── survival analysis ────────────────────────────────────────────────────────
export { kaplanMeier, logRankTest } from "./survival.ts";
export type { SurvivalEvent, KaplanMeierResult, LogRankResult } from "./survival.ts";

// ─── time series ─────────────────────────────────────────────────────────────
export { acf, pacf, fitArma, ljungBox } from "./timeseries.ts";
export type { AutocorrResult, ArmaParams, LjungBoxResult } from "./timeseries.ts";

// ─── PCA / factor analysis ────────────────────────────────────────────────────
export { pca, factorAnalysis } from "./factor.ts";
export type { PcaResult, PcaOptions, FactorResult } from "./factor.ts";

// ─── Bayesian inference ───────────────────────────────────────────────────────
export {
  betaBinomialUpdate,
  betaMean,
  betaVariance,
  betaMode,
  betaCredibleInterval,
  normalNormalUpdate,
  normalCredibleInterval,
  gammaPoissonUpdate,
  gammaMean,
  gammaVariance,
  dirichletCategoricalUpdate,
  dirichletMean,
} from "./bayesian.ts";
export type {
  BetaParams,
  NormalParams,
  GammaParams,
  DirichletParams,
  CredibleInterval,
} from "./bayesian.ts";
