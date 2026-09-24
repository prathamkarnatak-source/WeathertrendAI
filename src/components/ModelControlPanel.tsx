import React from 'react';
import {
  SlidersHorizontal,
  TrendingUp,
  Waves,
  Activity,
  Layers,
  GitCompare,
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { ModelConfig, ModelType } from '../types/weather';

interface ModelControlPanelProps {
  config: ModelConfig;
  onChangeConfig: (newConfig: Partial<ModelConfig>) => void;
  compareMode: boolean;
  onToggleCompareMode: () => void;
  showAnomalies: boolean;
  onToggleAnomalies: () => void;
  anomalyThreshold: number;
  onChangeAnomalyThreshold: (val: number) => void;
  totalRecordsCount: number;
}

export const ModelControlPanel: React.FC<ModelControlPanelProps> = ({
  config,
  onChangeConfig,
  compareMode,
  onToggleCompareMode,
  showAnomalies,
  onToggleAnomalies,
  anomalyThreshold,
  onChangeAnomalyThreshold,
  totalRecordsCount,
}) => {
  const modelOptions: {
    type: ModelType;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      type: 'harmonic',
      label: 'Harmonic Seasonal',
      description: 'Annual solar cycle + secular linear warming trend',
      icon: <Waves className="w-4 h-4 text-sky-400" />,
    },
    {
      type: 'linear',
      label: 'Linear (OLS)',
      description: 'Ordinary least squares constant secular trend',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    },
    {
      type: 'polynomial',
      label: 'Polynomial',
      description: `Non-linear curvature (Degree ${config.polyDegree})`,
      icon: <Activity className="w-4 h-4 text-purple-400" />,
    },
    {
      type: 'holt_winters',
      label: "Holt's Exponential",
      description: 'Double exponential smoothing tracking level & trend',
      icon: <SlidersHorizontal className="w-4 h-4 text-amber-400" />,
    },
    {
      type: 'moving_average',
      label: 'Moving Average',
      description: `${config.maWindow}-day rolling window filter`,
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
    },
    {
      type: 'autoregressive',
      label: 'Autoregressive (AR)',
      description: 'Lag-1 and Lag-7 autoregressive persistence',
      icon: <SlidersHorizontal className="w-4 h-4 text-rose-400" />,
    },
  ];

  const splitPercentage = Math.round(config.trainTestSplitRatio * 100);
  const trainCount = Math.floor(totalRecordsCount * config.trainTestSplitRatio);
  const testCount = totalRecordsCount - trainCount;

  return (
    <div
      id="model-control-panel"
      className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg text-slate-200"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-400" />
              Time Series Regression & Modeling Controls
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {totalRecordsCount} observations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select regression model, calibrate parameters, evaluate train/test splits, and project forward trends.
          </p>
        </div>

        {/* Global toggles: Compare mode & Anomalies */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="toggle-compare-mode-btn"
            onClick={onToggleCompareMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              compareMode
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600/80 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Overlay Linear vs Polynomial vs Harmonic models simultaneously"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Multi-Model Compare</span>
          </button>

          <button
            id="toggle-anomalies-btn"
            onClick={onToggleAnomalies}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showAnomalies
                ? 'bg-rose-950/70 text-rose-300 border-rose-700/80 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Highlight extreme temperature anomalies (|Z| > threshold)"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Extreme Anomalies</span>
          </button>
        </div>
      </div>

      {/* Model Selection Tabs */}
      <div className="pt-4">
        <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider block mb-2">
          Regression Architecture
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {modelOptions.map((opt) => {
            const isSelected = config.type === opt.type;
            return (
              <button
                key={opt.type}
                id={`model-option-${opt.type}`}
                onClick={() => onChangeConfig({ type: opt.type })}
                className={`flex flex-col text-left p-2.5 rounded-xl border transition-all text-xs ${
                  isSelected
                    ? 'bg-sky-950/60 border-sky-500/80 text-white shadow-md ring-1 ring-sky-500/30'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium mb-1 text-slate-200">
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                </div>
                <span className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parameter Fine-Tuning & Forecast Horizon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800/80">
        {/* Dynamic Model Sub-Parameter */}
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          {config.type === 'polynomial' ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">Polynomial Degree:</span>
                <span className="font-semibold text-purple-400">Degree {config.polyDegree}</span>
              </div>
              <div className="flex gap-1.5">
                {[2, 3, 4].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => onChangeConfig({ polyDegree: deg })}
                    className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
                      config.polyDegree === deg
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {deg === 2 ? 'Quad (2)' : deg === 3 ? 'Cubic (3)' : 'Quartic (4)'}
                  </button>
                ))}
              </div>
            </div>
          ) : config.type === 'moving_average' ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">Window Size:</span>
                <span className="font-semibold text-indigo-400">{config.maWindow} Days</span>
              </div>
              <div className="flex gap-1">
                {[7, 30, 90, 365].map((win) => (
                  <button
                    key={win}
                    onClick={() => onChangeConfig({ maWindow: win })}
                    className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
                      config.maWindow === win
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {win === 365 ? '1 Year' : `${win}d`}
                  </button>
                ))}
              </div>
            </div>
          ) : config.type === 'holt_winters' ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Smoothing Level (α):</span>
                <span className="font-mono text-amber-400">{config.holtAlpha}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={config.holtAlpha}
                onChange={(e) => onChangeConfig({ holtAlpha: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          ) : config.type === 'harmonic' ? (
            <div className="text-xs">
              <span className="text-slate-400 block mb-1">Seasonal Harmonics:</span>
              <div className="text-[11px] text-sky-300 font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
                1st (365.25d) + 2nd (182.6d) Fourier Harmonics
              </div>
            </div>
          ) : (
            <div className="text-xs">
              <span className="text-slate-400 block mb-1">Feature Basis:</span>
              <div className="text-[11px] text-slate-300 font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
                Constant Linear Slope (OLS)
              </div>
            </div>
          )}
        </div>

        {/* Forecast Horizon Picker */}
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-sky-400" />
              Forecast Horizon:
            </span>
            <span className="font-semibold text-sky-400">{config.forecastDays} Days</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[30, 90, 180, 365].map((days) => (
              <button
                key={days}
                id={`forecast-horizon-${days}`}
                onClick={() => onChangeConfig({ forecastDays: days })}
                className={`py-1 text-xs rounded font-medium transition-colors ${
                  config.forecastDays === days
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {days === 365 ? '1 Yr' : `${days}d`}
              </button>
            ))}
          </div>
        </div>

        {/* Confidence Interval Picker */}
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Confidence Bounds:
            </span>
            <span className="font-semibold text-emerald-400">
              {(config.confidenceLevel * 100).toFixed(0)}%
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {([0.8, 0.95, 0.99] as const).map((ci) => (
              <button
                key={ci}
                id={`ci-level-${Math.round(ci * 100)}`}
                onClick={() => onChangeConfig({ confidenceLevel: ci })}
                className={`py-1 text-xs rounded font-medium transition-colors ${
                  config.confidenceLevel === ci
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {Math.round(ci * 100)}%
              </button>
            ))}
          </div>
        </div>

        {/* Train / Test Split Slider */}
        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400">Train/Test Split:</span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {splitPercentage === 100 ? (
                '100% Fit'
              ) : (
                <>
                  <span className="text-sky-400">{trainCount} tr</span> /{' '}
                  <span className="text-amber-400">{testCount} te</span>
                </>
              )}
            </span>
          </div>
          <input
            id="train-test-split-slider"
            type="range"
            min="0.5"
            max="1.0"
            step="0.05"
            value={config.trainTestSplitRatio}
            onChange={(e) =>
              onChangeConfig({ trainTestSplitRatio: parseFloat(e.target.value) })
            }
            className="w-full accent-sky-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>50/50</span>
            <span>70/30</span>
            <span>80/20</span>
            <span>100% Full</span>
          </div>
        </div>
      </div>

      {/* Anomalies threshold fine-tuner if anomalies enabled */}
      {showAnomalies && (
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-4 text-xs bg-rose-950/20 p-2 rounded-xl border border-rose-900/30">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              Residual Anomaly Threshold: Flagging observations deviating by{' '}
              <strong className="font-mono text-white">|Z| ≥ {anomalyThreshold}σ</strong> from model expected temperature.
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {[1.5, 2.0, 2.5, 3.0].map((t) => (
              <button
                key={t}
                onClick={() => onChangeAnomalyThreshold(t)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                  anomalyThreshold === t
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t}σ
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
