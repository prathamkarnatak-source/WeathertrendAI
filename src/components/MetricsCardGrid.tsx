import React from 'react';
import {
  Activity,
  Award,
  TrendingUp,
  TrendingDown,
  Waves,
  Gauge,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ModelEvaluation } from '../types/weather';

interface MetricsCardGridProps {
  metrics: ModelEvaluation;
  modelName: string;
  tempUnit: 'C' | 'F';
  isSplitEnabled: boolean;
}

export const MetricsCardGrid: React.FC<MetricsCardGridProps> = ({
  metrics,
  modelName,
  tempUnit,
  isSplitEnabled,
}) => {
  const formatDelta = (celsius: number): string => {
    if (tempUnit === 'F') {
      // Temperature delta conversion: 1°C delta = 1.8°F delta
      const fDelta = celsius * 1.8;
      return `${fDelta.toFixed(2)}°F`;
    }
    return `${celsius.toFixed(2)}°C`;
  };

  const formatErr = (celsius: number): string => {
    if (tempUnit === 'F') {
      const fErr = celsius * 1.8;
      return `${fErr.toFixed(2)}°F`;
    }
    return `${celsius.toFixed(2)}°C`;
  };

  // Durbin-Watson diagnostic interpretation
  const dw = metrics.durbinWatson;
  let dwStatus = 'Normal (Independent Residuals)';
  let dwColor = 'text-emerald-400';
  if (dw < 1.2) {
    dwStatus = 'Strong Positive Autocorrelation (Weather Persistence)';
    dwColor = 'text-amber-400';
  } else if (dw < 1.6) {
    dwStatus = 'Mild Autocorrelation (Synoptic Fronts)';
    dwColor = 'text-sky-400';
  } else if (dw > 2.5) {
    dwStatus = 'Negative Autocorrelation';
    dwColor = 'text-purple-400';
  }

  // R2 interpretation
  const r2Pct = Math.max(0, metrics.r2 * 100);
  let fitQuality = 'Strong Fit';
  let fitColor = 'text-emerald-400';
  if (r2Pct < 40) {
    fitQuality = 'Weak (Needs Seasonality)';
    fitColor = 'text-rose-400';
  } else if (r2Pct < 70) {
    fitQuality = 'Moderate Fit';
    fitColor = 'text-amber-400';
  }

  return (
    <div id="metrics-card-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. R² Coefficient of Determination */}
      <div
        id="metric-r2-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between"
      >
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Goodness of Fit (R²)
          </span>
          <Award className="w-4 h-4 text-sky-400" />
        </div>
        <div className="my-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            {r2Pct.toFixed(1)}%
          </div>
          <div className={`text-xs font-medium mt-0.5 ${fitColor}`}>
            {fitQuality} • Adj R²: {(metrics.adjustedR2 * 100).toFixed(1)}%
          </div>
        </div>
        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span>Train R²: {(metrics.trainR2 * 100).toFixed(1)}%</span>
          {isSplitEnabled && (
            <span className="text-amber-400">
              Test R²: {(metrics.testR2 * 100).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* 2. RMSE & MAE Precision */}
      <div
        id="metric-rmse-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between"
      >
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Prediction Error (RMSE)
          </span>
          <Activity className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="my-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            ±{formatErr(metrics.rmse)}
          </div>
          <div className="text-xs text-slate-300 font-medium mt-0.5">
            MAE: ±{formatErr(metrics.mae)} • SE: {formatErr(metrics.standardError)}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span>Train RMSE: {formatErr(metrics.trainRMSE)}</span>
          {isSplitEnabled && (
            <span className="text-amber-400">
              Test RMSE: {formatErr(metrics.testRMSE)}
            </span>
          )}
        </div>
      </div>

      {/* 3. Decadal Secular Trend Rate */}
      <div
        id="metric-trend-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between"
      >
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Secular Trend Velocity
          </span>
          {metrics.trendPerDecade >= 0 ? (
            <TrendingUp className="w-4 h-4 text-amber-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-sky-400" />
          )}
        </div>
        <div className="my-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight flex items-baseline gap-1">
            <span>
              {metrics.trendPerDecade >= 0 ? '+' : ''}
              {formatDelta(metrics.trendPerDecade)}
            </span>
            <span className="text-xs font-normal text-slate-400 font-sans">/ decade</span>
          </div>
          <div className="text-xs text-slate-300 mt-0.5">
            {(metrics.trendPerDecade / 10 >= 0 ? '+' : '') +
              formatDelta(metrics.trendPerDecade / 10)}{' '}
            per annual cycle
          </div>
        </div>
        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
          {metrics.trendPerDecade > 0.2
            ? 'Statistically significant warming drift'
            : metrics.trendPerDecade < -0.2
            ? 'Statistically significant cooling trend'
            : 'Stable long-term secular baseline'}
        </div>
      </div>

      {/* 4. Seasonal Cycle & Autocorrelation */}
      <div
        id="metric-diagnostics-card"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col justify-between"
      >
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Dynamics & Autocorrelation
          </span>
          <Gauge className="w-4 h-4 text-purple-400" />
        </div>
        <div className="my-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            DW {metrics.durbinWatson.toFixed(2)}
          </div>
          <div className={`text-xs font-medium truncate mt-0.5 ${dwColor}`} title={dwStatus}>
            {dwStatus}
          </div>
        </div>
        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span>Annual Amplitude:</span>
          <span className="font-mono text-slate-200">
            {metrics.annualAmplitude
              ? formatDelta(metrics.annualAmplitude)
              : 'Fitted via Model'}
          </span>
        </div>
      </div>
    </div>
  );
};
