/**
 * Principal Component Analysis (PCA) and factor analysis stubs.
 *
 * Mirrors `sklearn.decomposition.PCA` and `statsmodels.multivariate.factor`.
 * PCA is implemented via power-iteration SVD. Factor analysis is a stub
 * that returns the first PCA components (full ML factor analysis would
 * require iterative EM — beyond the scope of this stub).
 *
 * @example
 * ```ts
 * import { pca } from "tsb";
 *
 * const X = [[1, 2], [3, 4], [5, 6], [7, 8]];
 * const result = pca(X, 2);
 * // result.explainedVarianceRatio: [ratio1, ratio2]
 * ```
 *
 * @module
 */

// ─── types ────────────────────────────────────────────────────────────────────

/** Result of PCA. */
export interface PcaResult {
  /** Principal components — shape: `[nComponents × nFeatures]`. */
  readonly components: readonly (readonly number[])[];
  /** Explained variance for each component. */
  readonly explainedVariance: readonly number[];
  /** Fraction of total variance explained by each component. */
  readonly explainedVarianceRatio: readonly number[];
  /** Singular values associated with each component. */
  readonly singularValues: readonly number[];
  /** Mean of each feature (used to center the data). */
  readonly mean: readonly number[];
  /** Transformed data — shape: `[nSamples × nComponents]`. */
  readonly transformed: readonly (readonly number[])[];
}

/** Result of (stub) factor analysis. */
export interface FactorResult {
  /** Loading matrix — shape: `[nFeatures × nFactors]`. */
  readonly loadings: readonly (readonly number[])[];
  /** Estimated communalities (fraction of variance explained per feature). */
  readonly communalities: readonly number[];
  /** Unique variances (1 − communality per feature). */
  readonly uniquenesses: readonly number[];
}

/** Options for PCA. */
export interface PcaOptions {
  /** Centre data to zero mean before decomposition (default: `true`). */
  center?: boolean;
  /** Scale data to unit variance before decomposition (default: `false`). */
  scale?: boolean;
  /** Maximum power-iteration rounds per component (default: `100`). */
  maxIter?: number;
  /** Convergence tolerance for power iteration (default: `1e-9`). */
  tol?: number;
}

// ─── math helpers ─────────────────────────────────────────────────────────────

type Matrix = readonly (readonly number[])[];

/** Column mean of a matrix. */
function colMeans(X: Matrix): number[] {
  const m = X.length;
  const p = X[0]?.length ?? 0;
  const mu = new Array<number>(p).fill(0);
  for (const row of X) {
    for (let j = 0; j < p; j++) {
      mu[j] = (mu[j] ?? 0) + (row[j] ?? 0);
    }
  }
  for (let j = 0; j < p; j++) {
    mu[j] = (mu[j] ?? 0) / m;
  }
  return mu;
}

/** Column std of a matrix (std dev of each column). */
function colStds(X: Matrix, mu: readonly number[]): number[] {
  const m = X.length;
  const p = X[0]?.length ?? 0;
  const s = new Array<number>(p).fill(0);
  for (const row of X) {
    for (let j = 0; j < p; j++) {
      const d = (row[j] ?? 0) - (mu[j] ?? 0);
      s[j] = (s[j] ?? 0) + d * d;
    }
  }
  for (let j = 0; j < p; j++) {
    s[j] = Math.sqrt((s[j] ?? 0) / m);
  }
  return s;
}

/** Centre and optionally scale a matrix. Returns new rows. */
function preprocessMatrix(
  X: Matrix,
  center: boolean,
  scale: boolean,
): { data: number[][]; mu: number[]; sigma: number[] } {
  const mu = center ? colMeans(X) : new Array<number>(X[0]?.length ?? 0).fill(0);
  const rawSigma = scale ? colStds(X, mu) : undefined;
  const sigma = rawSigma ?? new Array<number>(X[0]?.length ?? 0).fill(1);

  const data: number[][] = X.map((row) =>
    row.map((v, j) => {
      const s = sigma[j] ?? 1;
      return (v - (mu[j] ?? 0)) / (s > 0 ? s : 1);
    }),
  );
  return { data, mu, sigma };
}

/** L2 norm of a vector. */
function norm(v: readonly number[]): number {
  let s = 0;
  for (const x of v) {
    s += x * x;
  }
  return Math.sqrt(s);
}

/** Dot product of two vectors. */
function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return s;
}

/** Multiply matrix (m×p) by column vector (p), returning (m,) vector. */
function matvec(X: readonly number[][], v: readonly number[]): number[] {
  return X.map((row) => dot(row, v));
}

/** Multiply matrix transposed (p×m) by vector (m), returning (p,) vector. */
function matTvec(X: readonly number[][], v: readonly number[]): number[] {
  const p = X[0]?.length ?? 0;
  const res = new Array<number>(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    const vi = v[i] ?? 0;
    const row = X[i];
    if (row === undefined) {
      continue;
    }
    for (let j = 0; j < p; j++) {
      res[j] = (res[j] ?? 0) + (row[j] ?? 0) * vi;
    }
  }
  return res;
}

/** Subtract outer product `sv·u·v^T` from matrix rows. */
function deflate(X: number[][], sv: number, u: readonly number[], v: readonly number[]): void {
  for (let i = 0; i < X.length; i++) {
    const ui = u[i] ?? 0;
    const row = X[i];
    if (row === undefined) {
      continue;
    }
    for (let j = 0; j < row.length; j++) {
      row[j] = (row[j] ?? 0) - sv * ui * (v[j] ?? 0);
    }
  }
}

/**
 * Power-iteration to find the leading singular triplet (u1, σ1, v1).
 * Returns `{ u, sigma, v }` or null if not converged.
 */
function leadingSingular(
  X: number[][],
  maxIter: number,
  tol: number,
): { u: number[]; sigma: number; v: number[] } | null {
  const m = X.length;
  const p = X[0]?.length ?? 0;
  if (m === 0 || p === 0) {
    return null;
  }

  // Initialise v as unit vector
  let v: number[] = new Array<number>(p).fill(0);
  v[0] = 1;

  for (let iter = 0; iter < maxIter; iter++) {
    const u = matvec(X, v);
    const su = norm(u);
    if (su < 1e-15) {
      return null;
    }
    const uNorm = u.map((x) => x / su);

    const vNew = matTvec(X, uNorm);
    const sv = norm(vNew);
    if (sv < 1e-15) {
      return null;
    }
    const vNorm = vNew.map((x) => x / sv);

    // Convergence check
    let diff = 0;
    for (let j = 0; j < p; j++) {
      diff += Math.abs((vNorm[j] ?? 0) - (v[j] ?? 0));
    }
    v = vNorm;
    if (diff < tol) {
      break;
    }
  }

  const u = matvec(X, v);
  const sigma = norm(u);
  const uFinal = sigma > 0 ? u.map((x) => x / sigma) : u;
  return { u: uFinal, sigma, v };
}

// ─── PCA ─────────────────────────────────────────────────────────────────────

/**
 * Principal Component Analysis via truncated SVD (power iteration).
 *
 * @param X           - Data matrix, shape `[nSamples × nFeatures]`.
 * @param nComponents - Number of components to extract.
 * @param options     - Centering, scaling, and convergence options.
 * @returns PCA result with components, explained variance, and projections.
 * @throws {RangeError} If `X` is empty or `nComponents` exceeds feature count.
 */
export function pca(X: Matrix, nComponents: number, options?: PcaOptions): PcaResult {
  const m = X.length;
  if (m === 0) {
    throw new RangeError("Data matrix must be non-empty");
  }
  const p = X[0]?.length ?? 0;
  if (nComponents < 1 || nComponents > p) {
    throw new RangeError(`nComponents must be between 1 and ${p}`);
  }
  const center = options?.center ?? true;
  const scale = options?.scale ?? false;
  const maxIter = options?.maxIter ?? 100;
  const tol = options?.tol ?? 1e-9;

  const { data, mu, sigma: _sigma } = preprocessMatrix(X, center, scale);

  // Total variance = sum of variances of centred columns
  const totalVar = mu.reduce((acc, _, j) => {
    let v = 0;
    for (const row of data) {
      v += (row[j] ?? 0) * (row[j] ?? 0);
    }
    return acc + v / m;
  }, 0);

  const components: number[][] = [];
  const singularValues: number[] = [];
  const explainedVariance: number[] = [];
  const working = data.map((row) => row.slice());

  for (let k = 0; k < nComponents; k++) {
    const trip = leadingSingular(working, maxIter, tol);
    if (trip === null) {
      break;
    }
    components.push(trip.v);
    singularValues.push(trip.sigma);
    explainedVariance.push((trip.sigma * trip.sigma) / m);
    deflate(working, trip.sigma, trip.u, trip.v);
  }

  const totalExplained = explainedVariance.reduce((a, b) => a + b, 0);
  let denom: number;
  if (totalVar > 0) {
    denom = totalVar;
  } else if (totalExplained > 0) {
    denom = totalExplained;
  } else {
    denom = 1;
  }
  const explainedVarianceRatio = explainedVariance.map((v) => v / denom);

  // Project data onto components
  const transformed = data.map((row) => components.map((comp) => dot(row, comp)));

  return {
    components,
    explainedVariance,
    explainedVarianceRatio,
    singularValues,
    mean: mu,
    transformed,
  };
}

// ─── factor analysis stub ─────────────────────────────────────────────────────

/**
 * Factor analysis (stub) — returns PCA-based loadings.
 *
 * Full Maximum Likelihood factor analysis requires iterative EM optimisation.
 * This stub uses the first `nFactors` PCA components scaled by their singular
 * values as an approximation of the loading matrix.
 *
 * @param X        - Data matrix, shape `[nSamples × nFeatures]`.
 * @param nFactors - Number of latent factors.
 * @returns Loading matrix and communalities.
 * @throws {RangeError} If `X` is empty or `nFactors` exceeds feature count.
 */
export function factorAnalysis(X: Matrix, nFactors: number): FactorResult {
  const p = X[0]?.length ?? 0;
  if (p === 0) {
    throw new RangeError("Data matrix must have at least one feature");
  }

  const result = pca(X, nFactors);

  // Loadings: component[j][i] * sqrt(explainedVariance[j])
  const loadings: number[][] = [];
  for (let i = 0; i < p; i++) {
    const row: number[] = [];
    for (let j = 0; j < nFactors; j++) {
      const loading =
        (result.components[j]?.[i] ?? 0) * Math.sqrt(result.explainedVariance[j] ?? 0);
      row.push(loading);
    }
    loadings.push(row);
  }

  const communalities = loadings.map((row) => row.reduce((s, v) => s + v * v, 0));
  const uniquenesses = communalities.map((c) => Math.max(0, 1 - c));

  return { loadings, communalities, uniquenesses };
}
