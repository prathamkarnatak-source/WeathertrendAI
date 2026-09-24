import {
  WeatherRecord,
  ModelConfig,
  RegressionModelOutput,
  FittedPoint,
  ForecastPoint,
  ModelEvaluation,
  DecompositionResult,
  AnomalyPoint,
} from '../types/weather';

/**
 * Solve linear system A * x = b using Gauss-Jordan elimination with partial pivoting.
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  // Create augmented matrix
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Search for maximum in this column
    let maxEl = Math.abs(M[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxEl) {
        maxEl = Math.abs(M[k][i]);
        maxRow = k;
      }
    }

    // Swap maximum row with current row
    const tmp = M[maxRow];
    M[maxRow] = M[i];
    M[i] = tmp;

    if (Math.abs(M[i][i]) < 1e-12) {
      return null; // Singular or nearly singular matrix
    }

    // Eliminate rows below and above
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const c = M[k][i] / M[i][i];
        for (let j = i; j <= n; j++) {
          if (i === j) {
            M[k][j] = 0;
          } else {
            M[k][j] -= c * M[i][j];
          }
        }
      }
    }
  }

  // Solution
  const x = new Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = M[i][n] / M[i][i];
  }
  return x;
}

/**
 * Calculate critical Z value based on confidence level
 */
function getZMultiplier(confidenceLevel: 0.8 | 0.95 | 0.99): number {
  switch (confidenceLevel) {
    case 0.8:
      return 1.282;
    case 0.99:
      return 2.576;
    case 0.95:
    default:
      return 1.96;
  }
}

/**
 * Calculate statistical evaluation metrics
 */
export function calculateMetrics(
  actual: number[],
  predicted: number[],
  paramCount: number,
  trainActual?: number[],
  trainPred?: number[],
  testActual?: number[],
  testPred?: number[]
): ModelEvaluation {
  const n = actual.length;
  if (n === 0) {
    return {
      r2: 0,
      adjustedR2: 0,
      rmse: 0,
      mae: 0,
      mape: 0,
      trainR2: 0,
      testR2: 0,
      trainRMSE: 0,
      testRMSE: 0,
      standardError: 0,
      durbinWatson: 2,
      trendPerDecade: 0,
    };
  }

  const meanActual = actual.reduce((a, b) => a + b, 0) / n;
  let ssTot = 0;
  let ssRes = 0;
  let sumAbsErr = 0;
  let sumApe = 0;
  let dwNumerator = 0;

  const residuals = actual.map((y, i) => y - predicted[i]);

  for (let i = 0; i < n; i++) {
    const diffActual = actual[i] - meanActual;
    ssTot += diffActual * diffActual;
    const res = residuals[i];
    ssRes += res * res;
    sumAbsErr += Math.abs(res);

    // MAPE with temperature guard (shift if near zero Celsius to prevent division by 0)
    const denom = Math.abs(actual[i]) < 0.5 ? 0.5 : Math.abs(actual[i]);
    sumApe += Math.abs(res) / denom;

    if (i > 0) {
      const d = residuals[i] - residuals[i - 1];
      dwNumerator += d * d;
    }
  }

  const r2 = ssTot > 1e-9 ? Math.max(-1, 1 - ssRes / ssTot) : 0;
  const adjustedR2 =
    n > paramCount + 1 ? 1 - ((1 - r2) * (n - 1)) / (n - paramCount - 1) : r2;
  const rmse = Math.sqrt(ssRes / n);
  const mae = sumAbsErr / n;
  const mape = (sumApe / n) * 100;
  const standardError = n > paramCount ? Math.sqrt(ssRes / (n - paramCount)) : rmse;
  const durbinWatson = ssRes > 1e-9 ? dwNumerator / ssRes : 2.0;

  // Compute train / test metrics if split was performed
  let trainR2 = r2;
  let trainRMSE = rmse;
  if (trainActual && trainPred && trainActual.length > 0) {
    const trMean = trainActual.reduce((a, b) => a + b, 0) / trainActual.length;
    let trSsTot = 0;
    let trSsRes = 0;
    for (let i = 0; i < trainActual.length; i++) {
      trSsTot += (trainActual[i] - trMean) ** 2;
      trSsRes += (trainActual[i] - trainPred[i]) ** 2;
    }
    trainR2 = trSsTot > 1e-9 ? Math.max(-1, 1 - trSsRes / trSsTot) : 0;
    trainRMSE = Math.sqrt(trSsRes / trainActual.length);
  }

  let testR2 = r2;
  let testRMSE = rmse;
  if (testActual && testPred && testActual.length > 0) {
    const teMean = testActual.reduce((a, b) => a + b, 0) / testActual.length;
    let teSsTot = 0;
    let teSsRes = 0;
    for (let i = 0; i < testActual.length; i++) {
      teSsTot += (testActual[i] - teMean) ** 2;
      teSsRes += (testActual[i] - testPred[i]) ** 2;
    }
    testR2 = teSsTot > 1e-9 ? Math.max(-1, 1 - teSsRes / teSsTot) : 0;
    testRMSE = Math.sqrt(teSsRes / testActual.length);
  }

  return {
    r2,
    adjustedR2,
    rmse,
    mae,
    mape,
    trainR2,
    testR2,
    trainRMSE,
    testRMSE,
    standardError,
    durbinWatson,
    trendPerDecade: 0, // Updated by specific models
  };
}

/**
 * Generate future dates array
 */
function generateFutureDates(lastDateStr: string, count: number): string[] {
  const dates: string[] = [];
  const curr = new Date(lastDateStr);
  for (let i = 1; i <= count; i++) {
    const next = new Date(curr);
    next.setDate(curr.getDate() + i);
    dates.push(next.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * LINEAR REGRESSION (Ordinary Least Squares)
 * Model: y = m * x + b
 */
export function fitLinearRegression(
  records: WeatherRecord[],
  config: ModelConfig
): RegressionModelOutput {
  const n = records.length;
  const splitIdx = Math.floor(n * Math.min(1.0, Math.max(0.2, config.trainTestSplitRatio)));
  const trainRecords = records.slice(0, splitIdx);
  const testRecords = records.slice(splitIdx);

  // Fit on training records
  const nTrain = trainRecords.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < nTrain; i++) {
    const x = trainRecords[i].dayIndex;
    const y = trainRecords[i].tempMean;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const meanX = sumX / nTrain;
  const meanY = sumY / nTrain;
  const denom = sumX2 - sumX * meanX;
  const slope = denom !== 0 ? (sumXY - sumX * meanY) / denom : 0;
  const intercept = meanY - slope * meanX;

  // Trend rate in °C per decade (365.25 days * 10 years = 3652.5 days)
  const trendPerDecade = slope * 3652.5;

  // Compute fitted values on all historical records
  const actuals: number[] = [];
  const predicteds: number[] = [];
  const trainActuals: number[] = [];
  const trainPreds: number[] = [];
  const testActuals: number[] = [];
  const testPreds: number[] = [];

  const fitted: FittedPoint[] = [];

  for (let i = 0; i < n; i++) {
    const rec = records[i];
    const x = rec.dayIndex;
    const y = rec.tempMean;
    const pred = slope * x + intercept;
    const isTest = i >= splitIdx;

    actuals.push(y);
    predicteds.push(pred);

    if (isTest) {
      testActuals.push(y);
      testPreds.push(pred);
    } else {
      trainActuals.push(y);
      trainPreds.push(pred);
    }
  }

  const metrics = calculateMetrics(
    actuals,
    predicteds,
    2,
    trainActuals,
    trainPreds,
    testActuals,
    testPreds
  );
  metrics.trendPerDecade = trendPerDecade;

  const z = getZMultiplier(config.confidenceLevel);
  const se = metrics.standardError;

  for (let i = 0; i < n; i++) {
    const rec = records[i];
    const pred = predicteds[i];
    const x = rec.dayIndex;
    // Prediction interval standard error includes distance from mean
    const leverage = denom > 0 ? 1 / nTrain + ((x - meanX) ** 2) / denom : 1 / nTrain;
    const interval = z * se * Math.sqrt(1 + leverage);

    fitted.push({
      date: rec.date,
      timestamp: new Date(rec.date).getTime(),
      dayIndex: x,
      actual: rec.tempMean,
      predicted: Number(pred.toFixed(2)),
      residual: Number((rec.tempMean - pred).toFixed(2)),
      lowerCI: Number((pred - interval).toFixed(2)),
      upperCI: Number((pred + interval).toFixed(2)),
      isTest: i >= splitIdx,
    });
  }

  // Forecast future points
  const forecast: ForecastPoint[] = [];
  const lastRec = records[records.length - 1];
  const futureDates = generateFutureDates(lastRec.date, config.forecastDays);

  for (let f = 0; f < futureDates.length; f++) {
    const x = lastRec.dayIndex + f + 1;
    const pred = slope * x + intercept;
    const leverage = denom > 0 ? 1 / nTrain + ((x - meanX) ** 2) / denom : 1 / nTrain;
    // Uncertainty grows as we step further into the future
    const interval = z * se * Math.sqrt(1 + leverage + f * 0.001);

    forecast.push({
      date: futureDates[f],
      timestamp: new Date(futureDates[f]).getTime(),
      dayIndex: x,
      predicted: Number(pred.toFixed(2)),
      lowerCI: Number((pred - interval).toFixed(2)),
      upperCI: Number((pred + interval).toFixed(2)),
    });
  }

  const sign = intercept >= 0 ? '+' : '-';
  const equation = `T(t) = ${slope.toFixed(4)}·t ${sign} ${Math.abs(intercept).toFixed(2)}`;

  return {
    id: 'linear',
    name: 'Linear Regression (OLS)',
    type: 'linear',
    equation,
    formulaDescription: 'Ordinary Least Squares estimating constant secular rate of change',
    coefficients: {
      slope,
      intercept,
      trendPerDecade,
    },
    metrics,
    fitted,
    forecast,
  };
}

/**
 * POLYNOMIAL REGRESSION (Degree 2, 3, or 4)
 * Solves normal equations using Vandermonde matrix
 */
export function fitPolynomialRegression(
  records: WeatherRecord[],
  config: ModelConfig
): RegressionModelOutput {
  const degree = Math.min(4, Math.max(2, config.polyDegree || 2));
  const n = records.length;
  const splitIdx = Math.floor(n * Math.min(1.0, Math.max(0.2, config.trainTestSplitRatio)));
  const trainRecords = records.slice(0, splitIdx);

  // Normalize x to range [-1, 1] to avoid ill-conditioned Vandermonde powers
  const minX = records[0].dayIndex;
  const maxX = records[records.length - 1].dayIndex;
  const spanX = maxX - minX || 1;
  const normX = (x: number) => (2 * (x - minX)) / spanX - 1;

  // Build matrix (degree + 1) x (degree + 1)
  const p = degree + 1;
  const A: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const b: number[] = new Array(p).fill(0);

  for (let i = 0; i < trainRecords.length; i++) {
    const xN = normX(trainRecords[i].dayIndex);
    const y = trainRecords[i].tempMean;

    // Powers
    const powers: number[] = new Array(2 * degree + 1);
    powers[0] = 1;
    for (let k = 1; k <= 2 * degree; k++) {
      powers[k] = powers[k - 1] * xN;
    }

    for (let row = 0; row < p; row++) {
      for (let col = 0; col < p; col++) {
        A[row][col] += powers[row + col];
      }
      b[row] += y * powers[row];
    }
  }

  const coeffs = solveLinearSystem(A, b) || new Array(p).fill(0);

  const evalPoly = (rawX: number): number => {
    const xN = normX(rawX);
    let val = 0;
    let currPower = 1;
    for (let k = 0; k < p; k++) {
      val += coeffs[k] * currPower;
      currPower *= xN;
    }
    return val;
  };

  const actuals: number[] = [];
  const predicteds: number[] = [];
  const trainActuals: number[] = [];
  const trainPreds: number[] = [];
  const testActuals: number[] = [];
  const testPreds: number[] = [];

  for (let i = 0; i < n; i++) {
    const rec = records[i];
    const pred = evalPoly(rec.dayIndex);
    const isTest = i >= splitIdx;
    actuals.push(rec.tempMean);
    predicteds.push(pred);

    if (isTest) {
      testActuals.push(rec.tempMean);
      testPreds.push(pred);
    } else {
      trainActuals.push(rec.tempMean);
      trainPreds.push(pred);
    }
  }

  const metrics = calculateMetrics(
    actuals,
    predicteds,
    p,
    trainActuals,
    trainPreds,
    testActuals,
    testPreds
  );

  // Linearized decadal slope over the observation window
  const deltaT = evalPoly(maxX) - evalPoly(minX);
  const years = spanX / 365.25;
  metrics.trendPerDecade = years > 0 ? (deltaT / years) * 10 : 0;

  const z = getZMultiplier(config.confidenceLevel);
  const se = metrics.standardError;
  const fitted: FittedPoint[] = [];

  for (let i = 0; i < n; i++) {
    const rec = records[i];
    const pred = predicteds[i];
    const interval = z * se * 1.05;

    fitted.push({
      date: rec.date,
      timestamp: new Date(rec.date).getTime(),
      dayIndex: rec.dayIndex,
      actual: rec.tempMean,
      predicted: Number(pred.toFixed(2)),
      residual: Number((rec.tempMean - pred).toFixed(2)),
      lowerCI: Number((pred - interval).toFixed(2)),
      upperCI: Number((pred + interval).toFixed(2)),
      isTest: i >= splitIdx,
    });
  }

  // Forecast future
  const forecast: ForecastPoint[] = [];
  const lastRec = records[records.length - 1];
  const futureDates = generateFutureDates(lastRec.date, config.forecastDays);

  for (let f = 0; f < futureDates.length; f++) {
    const rawX = lastRec.dayIndex + f + 1;
    const pred = evalPoly(rawX);
    // Poly models diverge strongly outside domain, so widen CI realistically
    const interval = z * se * (1 + (f / 100) ** 1.3);

    forecast.push({
      date: futureDates[f],
      timestamp: new Date(futureDates[f]).getTime(),
      dayIndex: rawX,
      predicted: Number(pred.toFixed(2)),
      lowerCI: Number((pred - interval).toFixed(2)),
      upperCI: Number((pred + interval).toFixed(2)),
    });
  }

  const equationTerms = coeffs
    .map((c, idx) => {
      if (idx === 0) return `${c.toFixed(2)}`;
      if (idx === 1) return `${c >= 0 ? '+' : '-'} ${Math.abs(c).toFixed(2)}x`;
      return `${c >= 0 ? '+' : '-'} ${Math.abs(c).toFixed(2)}x^${idx}`;
    })
    .join(' ');

  const coeffMap: Record<string, number> = {};
  coeffs.forEach((c, idx) => {
    coeffMap[`a${idx}`] = c;
  });

  return {
    id: `polynomial-${degree}`,
    name: `Polynomial Regression (Degree ${degree})`,
    type: 'polynomial',
    equation: `T(x_norm) = ${equationTerms}`,
    formulaDescription: `Non-linear ${degree}-degree polynomial fitting underlying curvature`,
    coefficients: coeffMap,
    metrics,
    fitted,
    forecast,
  };
}

/**
 * HARMONIC / FOURIER SEASONAL REGRESSION
 * Model: T(t) = a0 + b*t + A1*sin(omega*t) + B1*cos(omega*t) + A2*sin(2*omega*t) + B2*cos(2*omega*t)
 * This is the meteorological benchmark: incorporates annual orbital cycle (365.25 d) + linear trend.
 */
export function fitHarmonicRegression(
  records: WeatherRecord[],
  config: ModelConfig
): RegressionModelOutput {
  const n = records.length;
  const splitIdx = Math.floor(n * Math.min(1.0, Math.max(0.2, config.trainTestSplitRatio)));
  const trainRecords = records.slice(0, splitIdx);

  const omega = (2 * Math.PI) / 365.25; // Annual frequency
  const omegaSemi = 2 * omega; // Semi-annual harmonic

  // We fit: y = c0 + c1*t + c2*sin(w*t) + c3*cos(w*t) + c4*sin(2w*t) + c5*cos(2w*t)
  const p = 6;
  const A: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const b: number[] = new Array(p).fill(0);

  const getBasis = (t: number): number[] => [
    1,
    t,
    Math.sin(omega * t),
    Math.cos(omega * t),
    Math.sin(omegaSemi * t),
    Math.cos(omegaSemi * t),
  ];

  for (let i = 0; i < trainRecords.length; i++) {
    const t = trainRecords[i].dayIndex;
    const y = trainRecords[i].tempMean;
    const phi = getBasis(t);

    for (let r = 0; r < p; r++) {
      for (let c = 0; c < p; c++) {
        A[r][c] += phi[r] * phi[c];
      }
      b[r] += y * phi[r];
    }
  }

  const coeffs = solveLinearSystem(A, b) || new Array(p).fill(0);
  const [c0, cSlope, s1, c1, s2, c2] = coeffs;

  // Annual amplitude = sqrt(s1^2 + c1^2)
  const annualAmp = Math.sqrt(s1 * s1 + c1 * c1);
  const semiAmp = Math.sqrt(s2 * s2 + c2 * c2);
  const peakToTrough = 2 * annualAmp;

  const evalHarmonic = (t: number): number => {
    const phi = getBasis(t);
    return (
      c0 * phi[0] +
      cSlope * phi[1] +
      s1 * phi[2] +
      c1 * phi[3] +
      s2 * phi[4] +
      c2 * phi[5]
    );
  };

  const actuals: number[] = [];
  const predicteds: number[] = [];
  const trainActuals: number[] = [];
  const trainPreds: number[] = [];
  const testActuals: number[] = [];
  const testPreds: number[] = [];

  for (let i = 0; i < n; i++) {
    const rec = records[i];
    const pred = evalHarmonic(rec.dayIndex);
    const isTest = i >= splitIdx;

    actuals.push(rec.tempMean);
    predicteds.push(pred);

    if (isTest) {
      testActuals.push(rec.tempMean);
      testPreds.push(pred);
    } else {
      trainActuals.push(rec.tempMean);
      trainPreds.push(pred);
    }
  }

  const metrics = calculateMetrics(
    actuals,
    predicteds,
    p,
    trainActuals,
    trainPreds,
    testActuals,
    testPreds
  );
  metrics.trendPerDecade = cSlope * 3652.5;
  metrics.annualAmplitude = peakToTrough;

  const z = getZMultiplier(config.confidenceLevel);
  const se = metrics.standardError;
  const fitted: FittedPoint[] = [];

  for (let i = 0; i < n; i++) {
    const rec = records[i];
    const pred = predicteds[i];
    const interval = z * se;

    fitted.push({
      date: rec.date,
      timestamp: new Date(rec.date).getTime(),
      dayIndex: rec.dayIndex,
      actual: rec.tempMean,
      predicted: Number(pred.toFixed(2)),
      residual: Number((rec.tempMean - pred).toFixed(2)),
      lowerCI: Number((pred - interval).toFixed(2)),
      upperCI: Number((pred + interval).toFixed(2)),
      isTest: i >= splitIdx,
    });
  }

  // Forecast future
  const forecast: ForecastPoint[] = [];
  const lastRec = records[records.length - 1];
  const futureDates = generateFutureDates(lastRec.date, config.forecastDays);

  for (let f = 0; f < futureDates.length; f++) {
    const t = lastRec.dayIndex + f + 1;
    const pred = evalHarmonic(t);
    // Harmonic retains periodic stability, with slight uncertainty cone
    const interval = z * se * Math.sqrt(1 + (f / 365.25) * 0.08);

    forecast.push({
      date: futureDates[f],
      timestamp: new Date(futureDates[f]).getTime(),
      dayIndex: t,
      predicted: Number(pred.toFixed(2)),
      lowerCI: Number((pred - interval).toFixed(2)),
      upperCI: Number((pred + interval).toFixed(2)),
    });
  }

  const equation = `T(t) = ${c0.toFixed(1)} + ${cSlope.toFixed(4)}·t + ${annualAmp.toFixed(1)}·sin(ω·t + φ) + ${semiAmp.toFixed(1)}·sin(2ω·t + φ₂)`;

  return {
    id: 'harmonic',
    name: 'Harmonic Seasonal Regression',
    type: 'harmonic',
    equation,
    formulaDescription:
      'Fourier sinusoidal decomposition fitting annual solar oscillation plus decadal secular trend',
    coefficients: {
      intercept: c0,
      linearSlope: cSlope,
      annualAmplitude: annualAmp,
      semiAnnualAmplitude: semiAmp,
      peakToTroughRange: peakToTrough,
      trendPerDecade: metrics.trendPerDecade,
    },
    metrics,
    fitted,
    forecast,
  };
}

/**
 * HOLT'S LINEAR TREND / EXPONENTIAL SMOOTHING
 */
export function fitHoltWinters(
  records: WeatherRecord[],
  config: ModelConfig
): RegressionModelOutput {
  const n = records.length;
  const alpha = config.holtAlpha || 0.2;
  const beta = config.holtBeta || 0.05;

  let level = records[0].tempMean;
  let trend = (records[1].tempMean - records[0].tempMean) || 0;

  const actuals: number[] = [];
  const predicteds: number[] = [];
  const fitted: FittedPoint[] = [];

  for (let i = 0; i < n; i++) {
    const y = records[i].tempMean;
    const oneStepAhead = level + trend;
    actuals.push(y);
    predicteds.push(oneStepAhead);

    // Update level and trend
    const prevLevel = level;
    level = alpha * y + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  const metrics = calculateMetrics(actuals, predicteds, 2);
  metrics.trendPerDecade = trend * 3652.5;

  const z = getZMultiplier(config.confidenceLevel);
  const se = metrics.standardError;

  for (let i = 0; i < n; i++) {
    const pred = predicteds[i];
    const rec = records[i];
    const interval = z * se;

    fitted.push({
      date: rec.date,
      timestamp: new Date(rec.date).getTime(),
      dayIndex: rec.dayIndex,
      actual: rec.tempMean,
      predicted: Number(pred.toFixed(2)),
      residual: Number((rec.tempMean - pred).toFixed(2)),
      lowerCI: Number((pred - interval).toFixed(2)),
      upperCI: Number((pred + interval).toFixed(2)),
      isTest: false,
    });
  }

  // Forecast
  const forecast: ForecastPoint[] = [];
  const lastRec = records[records.length - 1];
  const futureDates = generateFutureDates(lastRec.date, config.forecastDays);

  for (let f = 0; f < futureDates.length; f++) {
    const h = f + 1;
    // Damped trend forecast
    const pred = level + h * trend * Math.exp(-0.002 * h);
    const interval = z * se * Math.sqrt(h);

    forecast.push({
      date: futureDates[f],
      timestamp: new Date(futureDates[f]).getTime(),
      dayIndex: lastRec.dayIndex + h,
      predicted: Number(pred.toFixed(2)),
      lowerCI: Number((pred - interval).toFixed(2)),
      upperCI: Number((pred + interval).toFixed(2)),
    });
  }

  return {
    id: 'holt',
    name: "Holt's Linear Exponential Smoothing",
    type: 'holt_winters',
    equation: `L_t = ${alpha}·Y_t + ${(1 - alpha).toFixed(2)}·(L_{t-1}+T_{t-1}),  T_t = ${beta}·ΔL + ${(1 - beta).toFixed(2)}·T_{t-1}`,
    formulaDescription: 'Double exponential smoothing tracking dynamic local level and slope',
    coefficients: {
      finalLevel: level,
      finalTrend: trend,
      alpha,
      beta,
    },
    metrics,
    fitted,
    forecast,
  };
}

/**
 * MOVING AVERAGE REGRESSION / ROLLING SMOOTHING
 */
export function fitMovingAverage(
  records: WeatherRecord[],
  config: ModelConfig
): RegressionModelOutput {
  const windowSize = config.maWindow || 30;
  const n = records.length;

  const actuals: number[] = [];
  const predicteds: number[] = [];

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - windowSize + 1);
    let sum = 0;
    let count = 0;
    for (let k = start; k <= i; k++) {
      sum += records[k].tempMean;
      count++;
    }
    const ma = sum / count;
    actuals.push(records[i].tempMean);
    predicteds.push(ma);
  }

  const metrics = calculateMetrics(actuals, predicteds, 1);
  const z = getZMultiplier(config.confidenceLevel);
  const se = metrics.standardError;
  const fitted: FittedPoint[] = [];

  for (let i = 0; i < n; i++) {
    const rec = records[i];
    const pred = predicteds[i];
    const interval = z * se;

    fitted.push({
      date: rec.date,
      timestamp: new Date(rec.date).getTime(),
      dayIndex: rec.dayIndex,
      actual: rec.tempMean,
      predicted: Number(pred.toFixed(2)),
      residual: Number((rec.tempMean - pred).toFixed(2)),
      lowerCI: Number((pred - interval).toFixed(2)),
      upperCI: Number((pred + interval).toFixed(2)),
      isTest: false,
    });
  }

  // Forecast: Trailing average projected forward
  const forecast: ForecastPoint[] = [];
  const lastRec = records[records.length - 1];
  const lastMA = predicteds[predicteds.length - 1];
  const futureDates = generateFutureDates(lastRec.date, config.forecastDays);

  for (let f = 0; f < futureDates.length; f++) {
    const interval = z * se * Math.sqrt(1 + f * 0.05);
    forecast.push({
      date: futureDates[f],
      timestamp: new Date(futureDates[f]).getTime(),
      dayIndex: lastRec.dayIndex + f + 1,
      predicted: Number(lastMA.toFixed(2)),
      lowerCI: Number((lastMA - interval).toFixed(2)),
      upperCI: Number((lastMA + interval).toFixed(2)),
    });
  }

  return {
    id: `ma-${windowSize}`,
    name: `Simple Moving Average (${windowSize}-Day)`,
    type: 'moving_average',
    equation: `SMA_${windowSize}(t) = (1/${windowSize}) · Σ_{i=0}^{${windowSize}-1} Y_{t-i}`,
    formulaDescription: `Trailing ${windowSize}-day rolling window filtering out high-frequency noise`,
    coefficients: {
      windowSize,
      lastAverage: lastMA,
    },
    metrics,
    fitted,
    forecast,
  };
}

/**
 * AUTOREGRESSIVE AR(p) MODEL (Lag 1 and Lag 7)
 * Predicts today's temperature from yesterday's and last week's temperature
 */
export function fitAutoregressive(
  records: WeatherRecord[],
  config: ModelConfig
): RegressionModelOutput {
  const n = records.length;
  // Fit on y_t = c0 + c1 * y_{t-1} + c2 * y_{t-7}
  const lags = config.arLags || [1, 7];
  const maxLag = Math.max(...lags);

  const numRows = n - maxLag;
  if (numRows <= 10) {
    // Fall back to linear if not enough data
    return fitLinearRegression(records, config);
  }

  const p = lags.length + 1;
  const A: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const b: number[] = new Array(p).fill(0);

  for (let i = maxLag; i < n; i++) {
    const y = records[i].tempMean;
    const xVec = [1, ...lags.map((lag) => records[i - lag].tempMean)];

    for (let r = 0; r < p; r++) {
      for (let c = 0; c < p; c++) {
        A[r][c] += xVec[r] * xVec[c];
      }
      b[r] += y * xVec[r];
    }
  }

  const coeffs = solveLinearSystem(A, b) || new Array(p).fill(0);
  const [c0, ...lagCoeffs] = coeffs;

  const actuals: number[] = [];
  const predicteds: number[] = [];
  const fitted: FittedPoint[] = [];

  for (let i = 0; i < n; i++) {
    const rec = records[i];
    let pred = rec.tempMean;
    if (i >= maxLag) {
      pred = c0;
      for (let l = 0; l < lags.length; l++) {
        pred += lagCoeffs[l] * records[i - lags[l]].tempMean;
      }
    }
    actuals.push(rec.tempMean);
    predicteds.push(pred);
  }

  const metrics = calculateMetrics(
    actuals.slice(maxLag),
    predicteds.slice(maxLag),
    p
  );
  const z = getZMultiplier(config.confidenceLevel);
  const se = metrics.standardError;

  for (let i = 0; i < n; i++) {
    const rec = records[i];
    const pred = predicteds[i];
    const interval = z * se;

    fitted.push({
      date: rec.date,
      timestamp: new Date(rec.date).getTime(),
      dayIndex: rec.dayIndex,
      actual: rec.tempMean,
      predicted: Number(pred.toFixed(2)),
      residual: Number((rec.tempMean - pred).toFixed(2)),
      lowerCI: Number((pred - interval).toFixed(2)),
      upperCI: Number((pred + interval).toFixed(2)),
      isTest: false,
    });
  }

  // Recursive forecasting for future horizon
  const forecast: ForecastPoint[] = [];
  const lastRec = records[records.length - 1];
  const futureDates = generateFutureDates(lastRec.date, config.forecastDays);

  const history = records.map((r) => r.tempMean);

  for (let f = 0; f < futureDates.length; f++) {
    let nextPred = c0;
    for (let l = 0; l < lags.length; l++) {
      const lag = lags[l];
      const val = history[history.length - lag];
      nextPred += lagCoeffs[l] * val;
    }
    history.push(nextPred);

    const interval = z * se * Math.sqrt(1 + f * 0.1);
    forecast.push({
      date: futureDates[f],
      timestamp: new Date(futureDates[f]).getTime(),
      dayIndex: lastRec.dayIndex + f + 1,
      predicted: Number(nextPred.toFixed(2)),
      lowerCI: Number((nextPred - interval).toFixed(2)),
      upperCI: Number((nextPred + interval).toFixed(2)),
    });
  }

  const eqLags = lags.map((l, idx) => `+ ${lagCoeffs[idx].toFixed(2)}·Y_{t-${l}}`).join(' ');
  const equation = `Y_t = ${c0.toFixed(2)} ${eqLags}`;

  const coeffMap: Record<string, number> = { intercept: c0 };
  lags.forEach((l, idx) => {
    coeffMap[`lag_${l}`] = lagCoeffs[idx];
  });

  return {
    id: `ar-${lags.join('-')}`,
    name: `Autoregressive AR(Lag ${lags.join(', ')})`,
    type: 'autoregressive',
    equation,
    formulaDescription:
      'Time series regression modeling persistence from 1-day and 7-day historical lags',
    coefficients: coeffMap,
    metrics,
    fitted,
    forecast,
  };
}

/**
 * Dispatcher to fit any configured model
 */
export function fitModel(
  records: WeatherRecord[],
  config: ModelConfig
): RegressionModelOutput {
  switch (config.type) {
    case 'linear':
      return fitLinearRegression(records, config);
    case 'polynomial':
      return fitPolynomialRegression(records, config);
    case 'harmonic':
      return fitHarmonicRegression(records, config);
    case 'holt_winters':
      return fitHoltWinters(records, config);
    case 'moving_average':
      return fitMovingAverage(records, config);
    case 'autoregressive':
      return fitAutoregressive(records, config);
    default:
      return fitHarmonicRegression(records, config);
  }
}

/**
 * CLASSICAL TIME SERIES DECOMPOSITION
 * Decomposes series into: Observed = Trend + Seasonal + Residual
 */
export function decomposeTimeSeries(records: WeatherRecord[]): DecompositionResult {
  const n = records.length;
  if (n < 30) {
    return {
      points: records.map((r) => ({
        date: r.date,
        observed: r.tempMean,
        trend: r.tempMean,
        seasonal: 0,
        residual: 0,
      })),
      seasonalProfile: [],
    };
  }

  // 1. Extract Trend using centered moving average
  // If multi-year data, window ~ 365, otherwise window ~ 31
  const halfWindow = n >= 400 ? 182 : 15;
  const trend: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(n - 1, i + halfWindow);
    let sum = 0;
    let count = 0;
    for (let k = start; k <= end; k++) {
      sum += records[k].tempMean;
      count++;
    }
    trend[i] = sum / count;
  }

  // 2. Detrended series = Observed - Trend
  const detrended = records.map((r, i) => r.tempMean - trend[i]);

  // 3. Seasonal component: average detrended value by day of year (or month)
  const monthSums: number[] = new Array(12).fill(0);
  const monthCounts: number[] = new Array(12).fill(0);

  for (let i = 0; i < n; i++) {
    const m = new Date(records[i].date).getMonth(); // 0..11
    monthSums[m] += detrended[i];
    monthCounts[m]++;
  }

  const seasonalMonthlyDelta = monthSums.map((sum, m) =>
    monthCounts[m] > 0 ? sum / monthCounts[m] : 0
  );

  // Mean-center the seasonal component to ensure it sums to 0
  const seasonalMean =
    seasonalMonthlyDelta.reduce((a, b) => a + b, 0) / seasonalMonthlyDelta.length;
  const normalizedSeasonalDelta = seasonalMonthlyDelta.map((v) => v - seasonalMean);

  // Assign seasonal and residual to each point
  const points = records.map((r, i) => {
    const m = new Date(r.date).getMonth();
    const s = normalizedSeasonalDelta[m];
    const t = trend[i];
    const res = r.tempMean - t - s;
    return {
      date: r.date,
      observed: Number(r.tempMean.toFixed(2)),
      trend: Number(t.toFixed(2)),
      seasonal: Number(s.toFixed(2)),
      residual: Number(res.toFixed(2)),
    };
  });

  const seasonalProfile = normalizedSeasonalDelta.map((delta, m) => ({
    month: m + 1,
    averageSeasonalDelta: Number(delta.toFixed(2)),
  }));

  return {
    points,
    seasonalProfile,
  };
}

/**
 * DETECT METEOROLOGICAL RESIDUAL ANOMALIES
 * Detects observations that deviate by |Z| > threshold from model expectation
 */
export function detectAnomalies(
  fitted: FittedPoint[],
  thresholdZ: number = 2.0
): AnomalyPoint[] {
  if (fitted.length === 0) return [];

  const residuals = fitted.map((f) => f.residual);
  const meanRes = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const variance =
    residuals.reduce((acc, r) => acc + (r - meanRes) ** 2, 0) / residuals.length;
  const stdRes = Math.sqrt(variance) || 1;

  const anomalies: AnomalyPoint[] = [];

  for (let i = 0; i < fitted.length; i++) {
    const f = fitted[i];
    const z = (f.residual - meanRes) / stdRes;
    if (Math.abs(z) >= thresholdZ) {
      const type = z > 0 ? 'heatwave' : 'coldsnap';
      let severity: 'mild' | 'moderate' | 'extreme' = 'mild';
      if (Math.abs(z) >= 3.0) severity = 'extreme';
      else if (Math.abs(z) >= 2.5) severity = 'moderate';

      anomalies.push({
        date: f.date,
        actual: f.actual,
        expected: f.predicted,
        residual: f.residual,
        zScore: Number(z.toFixed(2)),
        type,
        severity,
      });
    }
  }

  return anomalies;
}
