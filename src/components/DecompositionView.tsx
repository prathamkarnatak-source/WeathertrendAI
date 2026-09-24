import React, { useMemo } from 'react';
import { DecompositionResult } from '../types/weather';
import { Layers, Calendar, HelpCircle } from 'lucide-react';

interface DecompositionViewProps {
  decomposition: DecompositionResult;
  tempUnit: 'C' | 'F';
}

export const DecompositionView: React.FC<DecompositionViewProps> = ({
  decomposition,
  tempUnit,
}) => {
  const formatTemp = (celsius: number): string => {
    if (tempUnit === 'F') {
      const f = (celsius * 9) / 5 + 32;
      return `${f.toFixed(1)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const formatDelta = (celsius: number): string => {
    if (tempUnit === 'F') {
      return `${(celsius * 1.8).toFixed(1)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const points = decomposition.points;
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  // Downsample points if there are too many for fast SVG rendering
  const sampledPoints = useMemo(() => {
    const step = Math.max(1, Math.floor(points.length / 300));
    return points.filter((_, idx) => idx % step === 0);
  }, [points]);

  // Mini-chart builder helper
  const renderSparkline = (
    getter: (p: (typeof points)[0]) => number,
    color: string,
    baselineZero = false
  ) => {
    if (sampledPoints.length === 0) return null;
    const values = sampledPoints.map(getter);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (baselineZero) {
      min = Math.min(min, 0);
      max = Math.max(max, 0);
    }
    const range = max - min || 1;
    const width = 600;
    const height = 70;

    const pathD = sampledPoints
      .map((p, i) => {
        const x = (i / (sampledPoints.length - 1)) * width;
        const y = height - ((getter(p) - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    const zeroY = baselineZero ? height - ((0 - min) / range) * height : null;

    return (
      <div className="w-full h-20 relative bg-slate-950/60 rounded-lg p-2 border border-slate-800">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {zeroY !== null && (
            <line
              x1="0"
              y1={zeroY}
              x2={width}
              y2={zeroY}
              stroke="#475569"
              strokeDasharray="2 2"
            />
          )}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  return (
    <div
      id="decomposition-view"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Classical Additive Time Series Decomposition
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Mathematical breakdown into: <strong className="text-slate-200">Observed (Y)</strong> ={' '}
            <strong className="text-sky-400">Trend (T)</strong> +{' '}
            <strong className="text-emerald-400">Seasonal (S)</strong> +{' '}
            <strong className="text-rose-400">Residual Noise (I)</strong>
          </p>
        </div>
      </div>

      {/* 4 Sparkline Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5">
        {/* 1. Observed Series */}
        <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-slate-300">1. Observed Historical Series (Y_t)</span>
            <span className="text-[11px] font-mono text-slate-400">
              Mean: {formatTemp(points.reduce((a, b) => a + b.observed, 0) / points.length || 0)}
            </span>
          </div>
          {renderSparkline((p) => p.observed, '#94a3b8')}
        </div>

        {/* 2. Isolated Underlying Trend */}
        <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-sky-400">2. Centered Trend Component (T_t)</span>
            <span className="text-[11px] font-mono text-sky-300">Filtered Multi-Month Drift</span>
          </div>
          {renderSparkline((p) => p.trend, '#38bdf8')}
        </div>

        {/* 3. Seasonal Cyclic Component */}
        <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-emerald-400">3. Seasonal Cycle Component (S_t)</span>
            <span className="text-[11px] font-mono text-emerald-300">Annual Solar Wave</span>
          </div>
          {renderSparkline((p) => p.seasonal, '#34d399', true)}
        </div>

        {/* 4. Irregular / Residual Noise */}
        <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-rose-400">4. Irregular Residuals (I_t)</span>
            <span className="text-[11px] font-mono text-rose-300">Synoptic Weather Volatility</span>
          </div>
          {renderSparkline((p) => p.residual, '#fb7185', true)}
        </div>
      </div>

      {/* Monthly Seasonal Deviation Profile Bar Chart */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            Average Monthly Deviation from Mean Temperature (Seasonal Profile)
          </span>
          <span className="text-[11px] text-slate-400">Sum of cyclic components = 0.0°</span>
        </div>

        <div className="grid grid-cols-12 gap-1.5 sm:gap-2">
          {decomposition.seasonalProfile.map((prof) => {
            const val = prof.averageSeasonalDelta;
            const isWarm = val >= 0;
            const maxAbs = Math.max(
              ...decomposition.seasonalProfile.map((p) => Math.abs(p.averageSeasonalDelta)),
              1
            );
            const barHeightPct = Math.min(100, Math.round((Math.abs(val) / maxAbs) * 80));

            return (
              <div
                key={prof.month}
                className="flex flex-col items-center bg-slate-950/40 p-2 rounded-lg border border-slate-800/80 text-center"
              >
                <span className="text-[11px] font-mono font-bold text-slate-300">
                  {monthNames[prof.month - 1]}
                </span>

                <div className="h-16 w-full flex items-center justify-center my-1.5 relative">
                  <div className="w-full h-px bg-slate-700 absolute" />
                  <div
                    className={`w-3.5 rounded-sm transition-all ${
                      isWarm
                        ? 'bg-amber-500 self-end -mb-[1px]'
                        : 'bg-sky-500 self-start -mt-[1px]'
                    }`}
                    style={{
                      height: `${Math.max(4, barHeightPct)}%`,
                    }}
                  />
                </div>

                <span
                  className={`text-[10px] font-mono font-semibold ${
                    isWarm ? 'text-amber-400' : 'text-sky-400'
                  }`}
                >
                  {isWarm ? '+' : ''}
                  {formatDelta(val)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
