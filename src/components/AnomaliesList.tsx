import React, { useState } from 'react';
import { AnomalyPoint } from '../types/weather';
import { AlertTriangle, Flame, Snowflake, Filter } from 'lucide-react';

interface AnomaliesListProps {
  anomalies: AnomalyPoint[];
  tempUnit: 'C' | 'F';
  thresholdZ: number;
}

export const AnomaliesList: React.FC<AnomaliesListProps> = ({
  anomalies,
  tempUnit,
  thresholdZ,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'heatwave' | 'coldsnap'>('all');

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

  const filtered = anomalies.filter((a) => {
    if (filterType === 'all') return true;
    return a.type === filterType;
  });

  return (
    <div
      id="anomalies-list-card"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Detected Statistical Meteorological Anomalies
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800/80 font-mono">
              {anomalies.length} events (|Z| ≥ {thresholdZ}σ)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Observations exceeding regression prediction bounds, capturing synoptic heat domes and polar vortex plunges.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({anomalies.length})
          </button>
          <button
            onClick={() => setFilterType('heatwave')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              filterType === 'heatwave'
                ? 'bg-rose-900/90 text-rose-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3 h-3 text-rose-400" />
            Heatwaves
          </button>
          <button
            onClick={() => setFilterType('coldsnap')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              filterType === 'coldsnap'
                ? 'bg-sky-900/90 text-sky-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Snowflake className="w-3 h-3 text-sky-400" />
            Cold Snaps
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No anomalies detected under current filter threshold (|Z| ≥ {thresholdZ}σ).
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold sticky top-0 bg-slate-900 z-10">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Phenomenon</th>
                <th className="py-2.5 px-3">Observed Temp</th>
                <th className="py-2.5 px-3">Seasonal Baseline</th>
                <th className="py-2.5 px-3">Anomaly Delta</th>
                <th className="py-2.5 px-3">Z-Score</th>
                <th className="py-2.5 px-3 text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.map((item) => {
                const isHeat = item.type === 'heatwave';
                return (
                  <tr
                    key={item.date}
                    className="hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-200 font-sans">
                      {item.date}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          isHeat
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
                            : 'bg-sky-950/60 text-sky-300 border border-sky-800/50'
                        }`}
                      >
                        {isHeat ? (
                          <Flame className="w-3 h-3 text-rose-400" />
                        ) : (
                          <Snowflake className="w-3 h-3 text-sky-400" />
                        )}
                        {isHeat ? 'Heatwave Extreme' : 'Cold Snap Blast'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">
                      {formatTemp(item.actual)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {formatTemp(item.expected)}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-bold ${
                        item.residual >= 0 ? 'text-rose-400' : 'text-sky-400'
                      }`}
                    >
                      {item.residual >= 0 ? '+' : ''}
                      {formatDelta(item.residual)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-semibold">
                      {item.zScore > 0 ? `+${item.zScore}σ` : `${item.zScore}σ`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          item.severity === 'extreme'
                            ? 'bg-red-600 text-white'
                            : item.severity === 'moderate'
                            ? 'bg-amber-600/80 text-amber-100'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
