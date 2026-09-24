import React, { useState } from 'react';
import {
  CloudSun,
  Search,
  Upload,
  Sparkles,
  Sliders,
  Download,
  Info,
  Calendar,
  MapPin,
  Flame,
} from 'lucide-react';
import { DatasetMeta } from '../types/weather';
import { PRESET_DATASETS } from '../data/presetDatasets';

interface NavbarProps {
  currentMeta: DatasetMeta;
  onSelectPreset: (presetId: string) => void;
  onOpenSearch: () => void;
  onOpenUpload: () => void;
  onOpenSynthetic: () => void;
  onToggleAi: () => void;
  isAiDrawerOpen: boolean;
  tempUnit: 'C' | 'F';
  onToggleUnit: () => void;
  onExportData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMeta,
  onSelectPreset,
  onOpenSearch,
  onOpenUpload,
  onOpenSynthetic,
  onToggleAi,
  isAiDrawerOpen,
  tempUnit,
  onToggleUnit,
  onExportData,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header
      id="main-navbar"
      className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Dataset Selector */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 p-0.5 shadow-inner flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <CloudSun className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-white leading-none">
                  ClimateTrend
                </h1>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60">
                  Analytics & Regression
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-tight mt-0.5 hidden sm:block">
                Time Series Decomposition & Temperature Prediction
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          {/* Dataset Selector Dropdown */}
          <div className="relative">
            <button
              id="dataset-dropdown-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 text-xs font-medium text-slate-200 transition-colors shadow-sm"
              title="Select Dataset"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {currentMeta.name}
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700/50 uppercase">
                {currentMeta.source}
              </span>
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div
                  id="dataset-dropdown-menu"
                  className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                    Preset Global Stations
                  </div>
                  {PRESET_DATASETS.map((p) => (
                    <button
                      key={p.meta.id}
                      onClick={() => {
                        onSelectPreset(p.meta.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                        currentMeta.id === p.meta.id
                          ? 'bg-sky-950/50 text-sky-300 font-medium border-l-2 border-sky-400'
                          : 'text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-slate-200">{p.meta.name}</div>
                        <div className="text-[10px] text-slate-400">{p.meta.climateType}</div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {p.meta.startDate.slice(0, 4)}–{p.meta.endDate.slice(0, 4)}
                      </span>
                    </button>
                  ))}

                  <div className="my-1 border-t border-slate-800" />
                  <div className="px-2 pt-1 flex flex-col gap-1">
                    <button
                      id="search-city-dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenSearch();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-sky-400 hover:bg-sky-950/40 hover:text-sky-300 flex items-center gap-2"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Fetch Real World City (Open-Meteo)
                    </button>
                    <button
                      id="upload-csv-dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenUpload();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import Custom Weather CSV
                    </button>
                    <button
                      id="synthetic-sim-dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenSynthetic();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-950/40 hover:text-amber-300 flex items-center gap-2"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Simulate Synthetic Climate
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Controls & Toggles */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Unit Toggle °C / °F */}
          <div className="flex items-center bg-slate-800 border border-slate-700/80 rounded-lg p-0.5 text-xs font-semibold">
            <button
              id="unit-toggle-c"
              onClick={onToggleUnit}
              className={`px-2.5 py-1 rounded transition-all ${
                tempUnit === 'C'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              °C
            </button>
            <button
              id="unit-toggle-f"
              onClick={onToggleUnit}
              className={`px-2.5 py-1 rounded transition-all ${
                tempUnit === 'F'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              °F
            </button>
          </div>

          {/* Export Data Button */}
          <button
            id="export-data-btn"
            onClick={onExportData}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            title="Export CSV Dataset & Regression Output"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>

          {/* AI Meteorological Insights Drawer Toggle */}
          <button
            id="ai-analysis-toggle-btn"
            onClick={onToggleAi}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
              isAiDrawerOpen
                ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white ring-2 ring-indigo-400/40'
                : 'bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-semibold">AI Insights</span>
          </button>
        </div>
      </div>
    </header>
  );
};
