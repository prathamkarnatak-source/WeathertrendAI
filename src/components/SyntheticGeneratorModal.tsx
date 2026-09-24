import React, { useState } from 'react';
import { Sliders, X, Sparkles, Play } from 'lucide-react';
import { createSyntheticDataset } from '../data/presetDatasets';
import { WeatherRecord, DatasetMeta } from '../types/weather';

interface SyntheticGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadedDataset: (meta: DatasetMeta, records: WeatherRecord[]) => void;
}

export const SyntheticGeneratorModal: React.FC<SyntheticGeneratorModalProps> = ({
  isOpen,
  onClose,
  onLoadedDataset,
}) => {
  const [name, setName] = useState('Experimental Climate Lab');
  const [baseTemp, setBaseTemp] = useState(14);
  const [seasonalAmp, setSeasonalAmp] = useState(10);
  const [trendDecade, setTrendDecade] = useState(0.6);
  const [noiseLevel, setNoiseLevel] = useState(2.8);
  const [years, setYears] = useState(6);
  const [hemisphere, setHemisphere] = useState<'north' | 'south'>('north');

  if (!isOpen) return null;

  const handleGenerate = () => {
    const { meta, records } = createSyntheticDataset({
      name,
      baseTemp,
      seasonalAmp,
      trendDecade,
      noiseLevel,
      years,
      hemisphere,
    });
    onLoadedDataset(meta, records);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800/80 flex items-center justify-center text-amber-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Simulate Synthetic Climate Time Series</h3>
            <p className="text-xs text-slate-400">
              Generate custom time series with specified seasonal cycles, noise, and warming drift.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Scenario Label</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Annual Mean Temp:</span>
                <span className="font-mono font-bold text-white">{baseTemp}°C</span>
              </div>
              <input
                type="range"
                min="-10"
                max="30"
                step="1"
                value={baseTemp}
                onChange={(e) => setBaseTemp(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Seasonal Amplitude:</span>
                <span className="font-mono font-bold text-sky-400">±{seasonalAmp}°C</span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                step="0.5"
                value={seasonalAmp}
                onChange={(e) => setSeasonalAmp(parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Secular Trend:</span>
                <span
                  className={`font-mono font-bold ${
                    trendDecade >= 0 ? 'text-amber-400' : 'text-sky-400'
                  }`}
                >
                  {trendDecade >= 0 ? '+' : ''}
                  {trendDecade}°C/decade
                </span>
              </div>
              <input
                type="range"
                min="-1.5"
                max="2.0"
                step="0.1"
                value={trendDecade}
                onChange={(e) => setTrendDecade(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Weather Noise (Std):</span>
                <span className="font-mono font-bold text-purple-400">σ = {noiseLevel}°C</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.2"
                value={noiseLevel}
                onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-slate-400 block mb-1">Time Horizon (Duration)</label>
              <select
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value={3}>3 Years (1,095 days)</option>
                <option value={5}>5 Years (1,826 days)</option>
                <option value={6}>6 Years (2,191 days)</option>
                <option value={10}>10 Years (3,652 days)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Seasonal Phase</label>
              <select
                value={hemisphere}
                onChange={(e) => setHemisphere(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="north">Northern Hemisphere (Warm July)</option>
                <option value="south">Southern Hemisphere (Warm January)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Synthesize & Analyze Series
          </button>
        </div>
      </div>
    </div>
  );
};
