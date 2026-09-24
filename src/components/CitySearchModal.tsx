import React, { useState } from 'react';
import { Search, MapPin, Loader2, X, Globe, Calendar, AlertCircle } from 'lucide-react';
import { WeatherRecord, DatasetMeta } from '../types/weather';

interface CitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadedDataset: (meta: DatasetMeta, records: WeatherRecord[]) => void;
}

export const CitySearchModal: React.FC<CitySearchModalProps> = ({
  isOpen,
  onClose,
  onLoadedDataset,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Time range defaults (e.g. 5-year multi-year archive)
  const [startYear, setStartYear] = useState('2019');
  const [endYear, setEndYear] = useState('2024');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to find location');
      const data = await res.json();
      setResults(data.results || []);
      if (!data.results || data.results.length === 0) {
        setError('No locations found matching your query.');
      }
    } catch (err: any) {
      setError(err.message || 'Error querying locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCity = async (loc: any) => {
    setFetchingData(true);
    setError(null);
    try {
      const startDate = `${startYear}-01-01`;
      const endDate = `${endYear}-12-31`;

      const res = await fetch(
        `/api/weather/historical?latitude=${loc.latitude}&longitude=${loc.longitude}&start_date=${startDate}&end_date=${endDate}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch historical archive');
      }

      const raw = await res.json();
      const daily = raw.daily;
      if (!daily || !daily.time || daily.time.length === 0) {
        throw new Error('No historical data returned for this location and date range.');
      }

      const records: WeatherRecord[] = [];
      for (let i = 0; i < daily.time.length; i++) {
        const dStr = daily.time[i];
        const mean = daily.temperature_2m_mean?.[i];
        const min = daily.temperature_2m_min?.[i];
        const max = daily.temperature_2m_max?.[i];
        const precip = daily.precipitation_sum?.[i];
        const wind = daily.windspeed_10m_max?.[i];

        if (mean === null || isNaN(mean)) continue;

        records.push({
          date: dStr,
          dayIndex: records.length,
          tempMean: Number(mean.toFixed(1)),
          tempMin: min !== null ? Number(min.toFixed(1)) : mean - 3,
          tempMax: max !== null ? Number(max.toFixed(1)) : mean + 3,
          precipitation: precip ?? 0,
          windSpeed: wind ?? 10,
        });
      }

      if (records.length === 0) {
        throw new Error('All returned records were empty or invalid.');
      }

      const meta: DatasetMeta = {
        id: `open-meteo-${loc.id || Date.now()}`,
        name: `${loc.name}${loc.admin1 ? ', ' + loc.admin1 : ''} (${loc.country_code || loc.country})`,
        location: `${loc.name}, ${loc.country || ''}`,
        country: loc.country || 'Global Station',
        latitude: loc.latitude,
        longitude: loc.longitude,
        elevation: loc.elevation || 0,
        climateType: `Coordinates (${loc.latitude.toFixed(2)}°, ${loc.longitude.toFixed(2)}°)`,
        description: `Official historical meteorological data from Open-Meteo archive covering ${startDate} to ${endDate}.`,
        source: 'open-meteo',
        startDate: records[0].date,
        endDate: records[records.length - 1].date,
      };

      onLoadedDataset(meta, records);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to download historical weather records');
    } finally {
      setFetchingData(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl p-6 text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800/80 flex items-center justify-center text-sky-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Fetch Real World Historical Weather
            </h3>
            <p className="text-xs text-slate-400">
              Query the global Open-Meteo historical archive for any city or station worldwide.
            </p>
          </div>
        </div>

        {/* Date Range Selection */}
        <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Start Year
            </label>
            <select
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              {['2015', '2018', '2019', '2020', '2021', '2022', '2023'].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              End Year
            </label>
            <select
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              {['2022', '2023', '2024', '2025'].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city (e.g. Madrid, Singapore, Toronto, Seoul)..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </form>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Matching Global Locations
            </div>
            {results.map((loc) => (
              <div
                key={loc.id}
                onClick={() => !fetchingData && handleSelectCity(loc)}
                className={`p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 cursor-pointer flex items-center justify-between transition-colors ${
                  fetchingData ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    {loc.name}
                    {loc.admin1 && (
                      <span className="text-slate-400 font-normal">, {loc.admin1}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {loc.country} • Lat: {loc.latitude.toFixed(2)}°, Lon: {loc.longitude.toFixed(2)}° • Elev: {loc.elevation ?? 0}m
                  </div>
                </div>
                <button className="px-3 py-1 bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900 rounded-lg text-xs font-medium shrink-0">
                  {fetchingData ? 'Fetching...' : 'Select & Load'}
                </button>
              </div>
            ))}
          </div>
        )}

        {fetchingData && (
          <div className="mt-4 p-4 rounded-xl bg-sky-950/40 border border-sky-800/60 text-center text-xs text-sky-300 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span>
              Downloading daily historical weather series ({startYear}–{endYear}) from Open-Meteo...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
