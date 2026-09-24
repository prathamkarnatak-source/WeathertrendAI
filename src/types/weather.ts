export interface WeatherRecord {
  date: string; // YYYY-MM-DD
  dayIndex: number; // sequential counter
  tempMean: number; // °C
  tempMin: number; // °C
  tempMax: number; // °C
  precipitation?: number; // mm
  windSpeed?: number; // km/h
  solarRadiation?: number; // MJ/m²
  humidity?: number; // %
}

export type DatasetSource = 'preset' | 'open-meteo' | 'upload' | 'synthetic';

export interface DatasetMeta {
  id: string;
  name: string;
  location: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number;
  climateType: string;
  description: string;
  source: DatasetSource;
  startDate: string;
  endDate: string;
}

export type ModelType =
  | 'linear'
  | 'polynomial'
  | 'harmonic'
  | 'holt_winters'
  | 'moving_average'
  | 'autoregressive';

export interface ModelConfig {
  type: ModelType;
  polyDegree: number; // 2, 3, or 4
  maWindow: number; // 7, 30, 90, 365
  holtAlpha: number; // 0.1 to 0.9
  holtBeta: number; // 0.01 to 0.5
  arLags: number[]; // e.g. [1, 2, 7]
  forecastDays: number; // 30, 90, 180, 365, 730
  trainTestSplitRatio: number; // 0.5 to 1.0 (1.0 = no split / all train)
  confidenceLevel: 0.8 | 0.95 | 0.99;
}

export interface FittedPoint {
  date: string;
  timestamp: number;
  dayIndex: number;
  actual: number;
  predicted: number;
  residual: number;
  lowerCI: number;
  upperCI: number;
  isTest: boolean;
}

export interface ForecastPoint {
  date: string;
  timestamp: number;
  dayIndex: number;
  predicted: number;
  lowerCI: number;
  upperCI: number;
}

export interface ModelEvaluation {
  r2: number;
  adjustedR2: number;
  rmse: number;
  mae: number;
  mape: number;
  trainR2: number;
  testR2: number;
  trainRMSE: number;
  testRMSE: number;
  standardError: number;
  durbinWatson: number;
  trendPerDecade: number;
  annualAmplitude?: number;
}

export interface RegressionModelOutput {
  id: string;
  name: string;
  type: ModelType;
  equation: string;
  formulaDescription: string;
  coefficients: Record<string, number>;
  metrics: ModelEvaluation;
  fitted: FittedPoint[];
  forecast: ForecastPoint[];
}

export interface DecompositionPoint {
  date: string;
  observed: number;
  trend: number;
  seasonal: number;
  residual: number;
}

export interface DecompositionResult {
  points: DecompositionPoint[];
  seasonalProfile: { month: number; averageSeasonalDelta: number }[];
}

export interface AnomalyPoint {
  date: string;
  actual: number;
  expected: number;
  residual: number;
  zScore: number;
  type: 'heatwave' | 'coldsnap';
  severity: 'mild' | 'moderate' | 'extreme';
}
