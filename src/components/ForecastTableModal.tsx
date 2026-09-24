import React, { useState } from 'react';
import { Table, X, Download, Calendar } from 'lucide-react';
import { ForecastPoint } from '../types/weather';

interface ForecastTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  forecastPoints: ForecastPoint[];
  modelName: string;
  tempUnit: 'C' | 'F';
}

export const ForecastTableModal: React.FC<ForecastTableModalProps> = ({
  isOpen,
  onClose,
  forecastPoints,
  modelName,
  tempUnit,
}) => {
  const [filterStep, setFilterStep] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  if (!isOpen) return null;

  const formatTemp = (celsius: number): string => {
    if (tempUnit === 'F') {
      const f = (celsius * 9) / 5 + 32;
      return `${f.toFixed(1)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const filteredPoints = forecastPoints.filter((_, idx) => {
    if (filterStep === 'daily') return true;
    if (filterStep === 'weekly') return idx % 7 === 0;
    return idx % 30 === 0;
  });

  const exportCSV = () => {
    const headers = ['Date', 'DayIndex', 'Predicted_Mean_C', 'Lower_CI_C', 'Upper_CI_C'];
    const rows = forecastPoints.map((f) => [
      f.date,
      f.dayIndex,
      f.predicted,
      f.lowerCI,
      f.upperCI,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `temperature_forecast_${modelName.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl p-6 text-slate-100 relative flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800/80 flex items-center justify-center text-sky-400">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Projected Forecast Schedule
              </h3>
              <p className="text-xs text-slate-400">
                Model: {modelName} • {forecastPoints.length} day forward horizon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-8">
            <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs">
              {(['daily', 'weekly', 'monthly'] as const).map((step) => (
                <button
                  key={step}
                  onClick={() => setFilterStep(step)}
                  className={`px-2 py-1 rounded capitalize font-medium ${
                    filterStep === step
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>

            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Table content */}
        <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-850 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-800">
                <th className="py-2.5 px-3.5">Future Date</th>
                <th className="py-2.5 px-3.5">Horizon Step</th>
                <th className="py-2.5 px-3.5 font-semibold text-sky-300">
                  Predicted Mean
                </th>
                <th className="py-2.5 px-3.5">Lower CI Bound</th>
                <th className="py-2.5 px-3.5">Upper CI Bound</th>
                <th className="py-2.5 px-3.5">Confidence Spread</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredPoints.map((f, idx) => (
                <tr key={f.date} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3.5 font-sans font-medium text-slate-200">
                    {f.date}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-500">
                    +{idx * (filterStep === 'weekly' ? 7 : filterStep === 'monthly' ? 30 : 1)}d
                  </td>
                  <td className="py-2.5 px-3.5 text-sky-400 font-bold">
                    {formatTemp(f.predicted)}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-400">
                    {formatTemp(f.lowerCI)}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-400">
                    {formatTemp(f.upperCI)}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                    ±{(Math.abs(f.upperCI - f.lowerCI) / 2).toFixed(1)}°
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
