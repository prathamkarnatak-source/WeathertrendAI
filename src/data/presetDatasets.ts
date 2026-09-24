import { WeatherRecord, DatasetMeta } from '../types/weather';

export interface PresetStation {
  meta: DatasetMeta;
  generateRecords: () => WeatherRecord[];
}

/**
 * Deterministic pseudo-random number generator for consistent realistic datasets
 */
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate daily dates array between two dates
 */
function getDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(startStr);
  const end = new Date(endStr);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Helper to build high-fidelity daily records based on meteorological parameters
 */
function synthesizeStationData(
  seed: number,
  startDate: string,
  endDate: string,
  baseTemp: number, // Annual average temperature
  seasonalAmp: number, // Peak-to-trough amplitude / 2
  phaseShiftDays: number, // Day of year of seasonal minimum (typically ~ Jan 20 in North, July 20 in South)
  warmingDecade: number, // °C per decade trend
  noiseStd: number, // Daily weather variability
  anomalyEvents: { day: number; delta: number; duration: number }[] = []
): WeatherRecord[] {
  const rand = seededRandom(seed);
  const dates = getDateRange(startDate, endDate);
  const records: WeatherRecord[] = [];

  let persistentNoise = 0;

  for (let i = 0; i < dates.length; i++) {
    const dStr = dates[i];
    const dateObj = new Date(dStr);
    const startObj = new Date(startDate);
    const dayOfYear =
      Math.floor((dateObj.getTime() - new Date(dateObj.getFullYear(), 0, 0).getTime()) / 86400000);

    // Secular trend (warming/cooling per day)
    const daysSinceStart = i;
    const trendDelta = (warmingDecade / 3652.5) * daysSinceStart;

    // Annual sinusoidal oscillation
    const omega = (2 * Math.PI) / 365.25;
    const seasonal = -seasonalAmp * Math.cos(omega * (dayOfYear - phaseShiftDays));

    // Semi-annual harmonic (slight asymmetry between spring warmup and autumn cooldown)
    const semiHarmonic = 0.15 * seasonalAmp * Math.sin(2 * omega * (dayOfYear - phaseShiftDays));

    // Autoregressive AR(1) noise simulating synoptic weather systems (3-7 day fronts)
    const whiteNoise = (rand() + rand() + rand() - 1.5) * 2 * noiseStd;
    persistentNoise = 0.65 * persistentNoise + 0.35 * whiteNoise;

    // Injected historical heatwaves / cold snaps
    let eventDelta = 0;
    for (const ev of anomalyEvents) {
      if (i >= ev.day && i < ev.day + ev.duration) {
        const progress = (i - ev.day) / ev.duration;
        eventDelta += ev.delta * Math.sin(progress * Math.PI);
      }
    }

    const mean = baseTemp + seasonal + semiHarmonic + trendDelta + persistentNoise + eventDelta;
    // Diurnal temperature variation
    const diurnalRange = Math.max(5, 7 + (rand() - 0.5) * 4);
    const min = mean - diurnalRange * 0.45;
    const max = mean + diurnalRange * 0.55;

    // Precipitation likelihood (higher when temperature swings negative/front passes)
    const precipChance = rand();
    const precipitation =
      precipChance > 0.72 ? Number(((rand() * 18) ** 1.3).toFixed(1)) : 0;

    const windSpeed = Number((12 + (rand() - 0.5) * 16 + (precipitation > 5 ? 12 : 0)).toFixed(1));
    const humidity = Math.min(
      98,
      Math.max(25, Number((68 + (rand() - 0.5) * 35 - (mean > 25 ? 15 : 0)).toFixed(0)))
    );

    records.push({
      date: dStr,
      dayIndex: i,
      tempMean: Number(mean.toFixed(1)),
      tempMin: Number(min.toFixed(1)),
      tempMax: Number(max.toFixed(1)),
      precipitation,
      windSpeed: Math.max(2, windSpeed),
      humidity,
    });
  }

  return records;
}

export const PRESET_DATASETS: PresetStation[] = [
  {
    meta: {
      id: 'london-heathrow',
      name: 'London Heathrow (UK)',
      location: 'London, Greater London',
      country: 'United Kingdom',
      latitude: 51.4775,
      longitude: -0.4614,
      elevation: 25,
      climateType: 'Cfb (Temperate Oceanic)',
      description:
        'Maritime temperate climate with mild winters, warm summers, and moderate precipitation. Features the historic July 2022 European heatwave.',
      source: 'preset',
      startDate: '2019-01-01',
      endDate: '2024-12-31',
    },
    generateRecords: () =>
      synthesizeStationData(
        1042,
        '2019-01-01',
        '2024-12-31',
        11.5, // Base mean
        8.2, // Seasonal amplitude (Jan min ~ 4.5°C, July max ~ 22°C)
        18, // Phase min in mid-Jan
        0.52, // +0.52°C / decade warming
        2.8, // Noise std
        [
          // July 2022 UK 40.3°C Record Heatwave (~day 1295)
          { day: 1294, delta: 12.5, duration: 4 },
          // February 2021 Beast from the East cold blast (~day 768)
          { day: 768, delta: -8.0, duration: 5 },
          // August 2020 heat surge (~day 585)
          { day: 585, delta: 8.5, duration: 6 },
        ]
      ),
  },
  {
    meta: {
      id: 'phoenix-sky-harbor',
      name: 'Phoenix Sky Harbor (USA)',
      location: 'Phoenix, Arizona',
      country: 'United States',
      latitude: 33.4373,
      longitude: -112.0078,
      elevation: 337,
      climateType: 'BWh (Subtropical Hot Desert)',
      description:
        'Arid desert climate with extreme summer heat, large diurnal temperature swings, and a pronounced urban heat island signature.',
      source: 'preset',
      startDate: '2019-01-01',
      endDate: '2024-12-31',
    },
    generateRecords: () =>
      synthesizeStationData(
        2089,
        '2019-01-01',
        '2024-12-31',
        24.2, // Base mean
        11.8, // Amplitude (winter ~13°C, summer ~36°C)
        15,
        0.78, // Strong warming trend + urban heat island
        2.4,
        [
          // Record July 2023 31 consecutive days above 43°C (~day 1645)
          { day: 1645, delta: 6.8, duration: 28 },
          // Unusual Jan 2021 frost dip
          { day: 740, delta: -6.5, duration: 4 },
        ]
      ),
  },
  {
    meta: {
      id: 'tokyo-haneda',
      name: 'Tokyo Haneda (Japan)',
      location: 'Tokyo, Kanto',
      country: 'Japan',
      latitude: 35.5494,
      longitude: 139.7798,
      elevation: 6,
      climateType: 'Cfa (Humid Subtropical)',
      description:
        'Distinct four seasons with cold, crisp winters, a rainy monsoon season (Tsuyu) in June, and hot humid summers influenced by the Pacific.',
      source: 'preset',
      startDate: '2019-01-01',
      endDate: '2024-12-31',
    },
    generateRecords: () =>
      synthesizeStationData(
        3471,
        '2019-01-01',
        '2024-12-31',
        16.3,
        10.4, // winter ~ 6°C, summer ~ 27°C
        25,
        0.44,
        3.1,
        [
          // Late June 2022 early intense heat dome (~day 1270)
          { day: 1270, delta: 7.2, duration: 8 },
          // Typhoon Faxai / Hagibis cold front disturbance in 2019
          { day: 280, delta: -6.0, duration: 4 },
        ]
      ),
  },
  {
    meta: {
      id: 'sydney-observatory',
      name: 'Sydney Observatory (Australia)',
      location: 'Sydney, New South Wales',
      country: 'Australia',
      latitude: -33.8598,
      longitude: 151.2048,
      elevation: 39,
      climateType: 'Cfa (Humid Subtropical - Southern Hemisphere)',
      description:
        'Southern hemisphere inverted seasonal cycle: warmest in January-February, coolest in July. Demonstrates seasonal phase shift.',
      source: 'preset',
      startDate: '2019-01-01',
      endDate: '2024-12-31',
    },
    generateRecords: () =>
      synthesizeStationData(
        4912,
        '2019-01-01',
        '2024-12-31',
        18.5,
        5.8, // Inverted phase!
        198, // Min temperature occurs around mid-July (day 198)
        0.38,
        2.6,
        [
          // Black Summer bushfire heat anomaly in Dec 2019 / Jan 2020 (~day 365)
          { day: 365, delta: 8.5, duration: 10 },
          // Antarctic polar vortex burst June 2021 (~day 890)
          { day: 890, delta: -5.5, duration: 5 },
        ]
      ),
  },
  {
    meta: {
      id: 'reykjavik-keflavik',
      name: 'Reykjavik (Iceland)',
      location: 'Reykjavík, Capital Region',
      country: 'Iceland',
      latitude: 64.1265,
      longitude: -21.8174,
      elevation: 52,
      climateType: 'Cfc (Subpolar Oceanic)',
      description:
        'North Atlantic subpolar climate moderated by the Irminger Current. Cool summers, relatively mild winters given latitude, high maritime volatility.',
      source: 'preset',
      startDate: '2019-01-01',
      endDate: '2024-12-31',
    },
    generateRecords: () =>
      synthesizeStationData(
        5823,
        '2019-01-01',
        '2024-12-31',
        5.2, // Base mean
        5.6, // Low amplitude: winter ~0°C, summer ~12°C
        32,
        0.65, // Arctic amplification
        3.5, // High weather volatility
        [
          // Record warm spell in July 2021 (~day 930)
          { day: 930, delta: 6.5, duration: 6 },
          // Arctic vortex freeze in Dec 2022 (~day 1445)
          { day: 1445, delta: -9.5, duration: 8 },
        ]
      ),
  },
  {
    meta: {
      id: 'denver-mile-high',
      name: 'Denver Central (USA)',
      location: 'Denver, Colorado',
      country: 'United States',
      latitude: 39.7392,
      longitude: -104.9903,
      elevation: 1609,
      climateType: 'BSk (Cold Semi-Arid / Continental)',
      description:
        'High elevation (5,280 ft) continental climate with low humidity, massive day-night temperature swings, and sudden Arctic cold front drops.',
      source: 'preset',
      startDate: '2019-01-01',
      endDate: '2024-12-31',
    },
    generateRecords: () =>
      synthesizeStationData(
        6734,
        '2019-01-01',
        '2024-12-31',
        10.8,
        12.6, // High amplitude: winter ~ -1°C, summer ~ 24°C
        12,
        0.55,
        4.2, // Large day-to-day fluctuations
        [
          // Famous Sept 2020 70°F (38°C) drop to snow in 24 hours (~day 616)
          { day: 616, delta: -14.0, duration: 4 },
          // Dec 2022 Arctic blast (~day 1450)
          { day: 1450, delta: -16.0, duration: 3 },
        ]
      ),
  },
];

/**
 * Generate a custom synthetic dataset for experimentation
 */
export function createSyntheticDataset(params: {
  name: string;
  baseTemp: number;
  seasonalAmp: number;
  trendDecade: number;
  noiseLevel: number;
  years: number;
  hemisphere: 'north' | 'south';
}): { meta: DatasetMeta; records: WeatherRecord[] } {
  const startDate = '2020-01-01';
  const endYear = 2020 + params.years - 1;
  const endDate = `${endYear}-12-31`;
  const phaseShift = params.hemisphere === 'north' ? 20 : 200;

  const records = synthesizeStationData(
    Date.now(),
    startDate,
    endDate,
    params.baseTemp,
    params.seasonalAmp,
    phaseShift,
    params.trendDecade,
    params.noiseLevel
  );

  const meta: DatasetMeta = {
    id: `synthetic-${Date.now()}`,
    name: params.name || 'Custom Synthetic Climate',
    location: 'Configurable Synthetic Station',
    country: params.hemisphere === 'north' ? 'Northern Hemisphere' : 'Southern Hemisphere',
    latitude: params.hemisphere === 'north' ? 45.0 : -45.0,
    longitude: 0,
    elevation: 100,
    climateType: 'Synthetic Simulated Time Series',
    description: `Configured with Base Temp: ${params.baseTemp}°C, Seasonal Amplitude: ±${params.seasonalAmp}°C, Trend: ${params.trendDecade >= 0 ? '+' : ''}${params.trendDecade}°C/decade, Noise: ${params.noiseLevel}.`,
    source: 'synthetic',
    startDate,
    endDate,
  };

  return { meta, records };
}

/**
 * Parse CSV file into WeatherRecords
 */
export function parseCSVWeather(csvText: string, filename: string): {
  meta: DatasetMeta;
  records: WeatherRecord[];
} {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV file has insufficient lines or is empty.');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Find date column
  const dateIdx = headers.findIndex((h) =>
    ['date', 'time', 'datetime', 'day', 'timestamp'].includes(h)
  );
  if (dateIdx === -1) {
    throw new Error("Could not find a 'date' column in CSV header. Found: " + headers.join(', '));
  }

  // Find temp column
  const tempIdx = headers.findIndex((h) =>
    [
      'temp',
      'temperature',
      'tempmean',
      'mean_temp',
      'tmean',
      'temperature_2m_mean',
      'tavg',
      'avg_temp',
    ].includes(h)
  );

  const minIdx = headers.findIndex((h) =>
    ['tempmin', 'min_temp', 'tmin', 'temperature_2m_min'].includes(h)
  );
  const maxIdx = headers.findIndex((h) =>
    ['tempmax', 'max_temp', 'tmax', 'temperature_2m_max'].includes(h)
  );
  const precipIdx = headers.findIndex((h) =>
    ['precip', 'precipitation', 'rain', 'rainfall', 'precipitation_sum'].includes(h)
  );

  const fallbackTempIdx = tempIdx !== -1 ? tempIdx : minIdx !== -1 ? minIdx : 1;

  const records: WeatherRecord[] = [];
  let dayCounter = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((val) => val.trim().replace(/['"]/g, ''));
    if (row.length <= dateIdx || !row[dateIdx]) continue;

    const rawDate = row[dateIdx];
    const parsedDate = new Date(rawDate);
    if (isNaN(parsedDate.getTime())) continue;

    const dateStr = parsedDate.toISOString().split('T')[0];
    const rawTemp = parseFloat(row[fallbackTempIdx]);
    if (isNaN(rawTemp)) continue;

    const minTemp = minIdx !== -1 && !isNaN(parseFloat(row[minIdx]))
      ? parseFloat(row[minIdx])
      : rawTemp - 3.5;

    const maxTemp = maxIdx !== -1 && !isNaN(parseFloat(row[maxIdx]))
      ? parseFloat(row[maxIdx])
      : rawTemp + 3.5;

    const precip = precipIdx !== -1 && !isNaN(parseFloat(row[precipIdx]))
      ? Math.max(0, parseFloat(row[precipIdx]))
      : undefined;

    records.push({
      date: dateStr,
      dayIndex: dayCounter++,
      tempMean: Number(rawTemp.toFixed(1)),
      tempMin: Number(minTemp.toFixed(1)),
      tempMax: Number(maxTemp.toFixed(1)),
      precipitation: precip,
    });
  }

  if (records.length === 0) {
    throw new Error('No valid weather rows could be extracted from CSV.');
  }

  // Sort chronologically
  records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  // Re-index days sequentially
  records.forEach((r, idx) => {
    r.dayIndex = idx;
  });

  const meta: DatasetMeta = {
    id: `upload-${Date.now()}`,
    name: filename.replace(/\.[^/.]+$/, ''),
    location: 'User Uploaded Dataset',
    country: 'Custom Source',
    latitude: 0,
    longitude: 0,
    elevation: 0,
    climateType: 'Custom Uploaded Series',
    description: `User imported dataset with ${records.length} time series observations.`,
    source: 'upload',
    startDate: records[0].date,
    endDate: records[records.length - 1].date,
  };

  return { meta, records };
}
