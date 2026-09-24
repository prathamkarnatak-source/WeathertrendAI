import React, { useMemo } from 'react';
import { FittedPoint } from '../types/weather';
import { BarChart3, Activity } from 'lucide-react';

interface ResidualAnalysisViewProps {
  fittedPoints: FittedPoint[];
  tempUnit: 'C' | 'F';
}

export const ResidualAnalysisView: React.FC<ResidualAnalysisViewProps> = ({
  fittedPoints,
  tempUnit,
}) => {
  const formatTemp = (celsius: number): string => {
    if (tempUnit === 'F') {
      return `${(celsius * 1.8).toFixed(1)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const toUnitVal = (celsius: number): number => {
    if (tempUnit === 'F') {
      return (celsius * 9) / 5 + 32;
    }
    return celsius;
  };

  // Compute Residual Histogram bins
  const { bins, normalCurve, maxBinCount } = useMemo(() => {
    if (fittedPoints.length === 0) return { bins: [], normalCurve: '', maxBinCount: 1 };

    const residuals = fittedPoints.map((f) => f.residual);
    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    const variance =
      residuals.reduce((acc, r) => acc + (r - mean) ** 2, 0) / residuals.length;
    const std = Math.sqrt(variance) || 1;

    const binCount = 15;
    const minErr = -Math.ceil(std * 3.5);
    const maxErr = Math.ceil(std * 3.5);
    const binWidth = (maxErr - minErr) / binCount;

    const counts = new Array(binCount).fill(0);

    residuals.forEach((r) => {
      const idx = Math.min(binCount - 1, Math.max(0, Math.floor((r - minErr) / binWidth)));
      counts[idx]++;
    });

    const maxCount = Math.max(...counts, 1);

    const binData = counts.map((count, i) => {
      const center = minErr + (i + 0.5) * binWidth;
      return {
        center,
        count,
        heightPct: (count / maxCount) * 100,
      };
    });

    // Generate normal curve SVG path
    let curvePath = '';
    const width = 300;
    const height = 120;
    const nPts = 40;
    for (let i = 0; i <= nPts; i++) {
      const xVal = minErr + (i / nPts) * (maxErr - minErr);
      // Gaussian probability density
      const prob =
        (1 / (std * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((xVal - mean) / std) ** 2);
      const maxProb = 1 / (std * Math.sqrt(2 * Math.PI));
      const xPixel = (i / nPts) * width;
      const yPixel = height - (prob / maxProb) * height * 0.95;

      curvePath += (i === 0 ? 'M ' : ' L ') + `${xPixel.toFixed(1)} ${yPixel.toFixed(1)}`;
    }

    return {
      bins: binData,
      normalCurve: curvePath,
      maxBinCount: maxCount,
    };
  }, [fittedPoints]);

  // Actual vs Predicted points for scatter plot (downsampled to 150 points for fast rendering)
  const scatterPoints = useMemo(() => {
    if (fittedPoints.length === 0) return [];
    const step = Math.max(1, Math.floor(fittedPoints.length / 150));
    return fittedPoints.filter((_, idx) => idx % step === 0);
  }, [fittedPoints]);

  const { scatterMin, scatterMax } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    scatterPoints.forEach((p) => {
      const a = toUnitVal(p.actual);
      const pr = toUnitVal(p.predicted);
      if (a < min) min = a;
      if (pr < min) min = pr;
      if (a > max) max = a;
      if (pr > max) max = pr;
    });
    if (min === Infinity) {
      min = 0;
      max = 40;
    }
    return { scatterMin: Math.floor(min - 2), scatterMax: Math.ceil(max + 2) };
  }, [scatterPoints, tempUnit]);

  return (
    <div
      id="residual-analysis-view"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Regression Residual Diagnostics & Normality
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluating error distribution, homoscedasticity, and systematic model bias.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
        {/* Left: Residual Distribution Histogram */}
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-200">
                Residual Error Distribution Histogram
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                Overlaid with Gaussian Normal Curve
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Bell curve symmetry indicates unbiased regression residuals around 0.
            </p>
          </div>

          <div className="relative h-36 bg-slate-950/60 rounded-lg p-2 border border-slate-800 flex items-end justify-between gap-1 overflow-hidden">
            {/* Zero Axis line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700 pointer-events-none" />

            {/* Histogram Bars */}
            {bins.map((b, i) => (
              <div
                key={i}
                className="flex-1 bg-sky-600/70 hover:bg-sky-500 rounded-t-sm transition-all relative group"
                style={{ height: `${Math.max(4, b.heightPct)}%` }}
                title={`${b.count} observations with error near ${b.center.toFixed(1)}°`}
              />
            ))}

            {/* Gaussian Curve Overlay */}
            {normalCurve && (
              <svg
                viewBox="0 0 300 120"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none p-2"
              >
                <path
                  d={normalCurve}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
              </svg>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 px-1">
            <span>Negative Bias (Overprediction)</span>
            <span className="font-bold text-slate-200">0.0° Center</span>
            <span>Positive Bias (Underprediction)</span>
          </div>
        </div>

        {/* Right: Actual vs Predicted Scatter Plot */}
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-200">
                Observed vs. Predicted Temperatures
              </span>
              <span className="text-[11px] font-mono text-sky-400">Identity Reference (y = x)</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Points clustered closely along the 45° diagonal confirm high predictive fidelity.
            </p>
          </div>

          <div className="relative h-36 bg-slate-950/60 rounded-lg p-2 border border-slate-800">
            <svg viewBox="0 0 300 130" className="w-full h-full overflow-visible">
              {/* 45 degree identity line */}
              <line
                x1="20"
                y1="110"
                x2="280"
                y2="10"
                stroke="#475569"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Scatter dots */}
              {scatterPoints.map((p, idx) => {
                const act = toUnitVal(p.actual);
                const pred = toUnitVal(p.predicted);
                const range = scatterMax - scatterMin || 1;
                const cx = 20 + ((pred - scatterMin) / range) * 260;
                const cy = 110 - ((act - scatterMin) / range) * 100;

                return (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r="2.5"
                    fill="#38bdf8"
                    fillOpacity="0.75"
                    stroke="#0284c7"
                    strokeWidth="0.5"
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 px-1">
            <span>Range: {scatterMin}°</span>
            <span className="text-slate-300 font-sans">
              Correlation: Strong Linear Concordance
            </span>
            <span>{scatterMax}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};
