import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  RegressionModelOutput,
  AnomalyPoint,
  FittedPoint,
  ForecastPoint,
} from '../types/weather';
import { Maximize2, Minimize2, ZoomIn, AlertCircle } from 'lucide-react';

interface TimeSeriesChartProps {
  primaryModel: RegressionModelOutput;
  comparisonModels?: RegressionModelOutput[];
  compareMode: boolean;
  anomalies: AnomalyPoint[];
  showAnomalies: boolean;
  tempUnit: 'C' | 'F';
  splitIndex: number;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  primaryModel,
  comparisonModels = [],
  compareMode,
  anomalies,
  showAnomalies,
  tempUnit,
  splitIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 420 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [zoomRange, setZoomRange] = useState<'all' | '3y' | '1y' | '6m' | 'forecast'>('all');

  // Convert Celsius to current selected unit
  const formatTemp = (celsius: number): string => {
    if (celsius === undefined || isNaN(celsius)) return '--';
    if (tempUnit === 'F') {
      const f = (celsius * 9) / 5 + 32;
      return `${f.toFixed(1)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  const toUnitVal = (celsius: number): number => {
    if (tempUnit === 'F') {
      return (celsius * 9) / 5 + 32;
    }
    return celsius;
  };

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setDimensions({
            width: Math.max(300, entry.contentRect.width),
            height: 440,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Combined timeline: fitted + forecast
  const fullTimeline = useMemo(() => {
    const combined: Array<{
      date: string;
      timestamp: number;
      actual?: number;
      primaryPred: number;
      lowerCI: number;
      upperCI: number;
      residual?: number;
      isForecast: boolean;
      isTest: boolean;
      comp1Pred?: number;
      comp2Pred?: number;
    }> = [];

    // Fitted points
    primaryModel.fitted.forEach((f, i) => {
      const item: (typeof combined)[0] = {
        date: f.date,
        timestamp: f.timestamp,
        actual: f.actual,
        primaryPred: f.predicted,
        lowerCI: f.lowerCI,
        upperCI: f.upperCI,
        residual: f.residual,
        isForecast: false,
        isTest: f.isTest,
      };

      if (compareMode && comparisonModels.length > 0) {
        if (comparisonModels[0]?.fitted[i]) {
          item.comp1Pred = comparisonModels[0].fitted[i].predicted;
        }
        if (comparisonModels[1]?.fitted[i]) {
          item.comp2Pred = comparisonModels[1].fitted[i].predicted;
        }
      }
      combined.push(item);
    });

    // Forecast points
    primaryModel.forecast.forEach((fc, i) => {
      const item: (typeof combined)[0] = {
        date: fc.date,
        timestamp: fc.timestamp,
        primaryPred: fc.predicted,
        lowerCI: fc.lowerCI,
        upperCI: fc.upperCI,
        isForecast: true,
        isTest: false,
      };

      if (compareMode && comparisonModels.length > 0) {
        if (comparisonModels[0]?.forecast[i]) {
          item.comp1Pred = comparisonModels[0].forecast[i].predicted;
        }
        if (comparisonModels[1]?.forecast[i]) {
          item.comp2Pred = comparisonModels[1].forecast[i].predicted;
        }
      }
      combined.push(item);
    });

    return combined;
  }, [primaryModel, comparisonModels, compareMode]);

  // Filter based on zoom range
  const visibleData = useMemo(() => {
    if (fullTimeline.length === 0) return [];
    const totalCount = fullTimeline.length;
    const historyCount = primaryModel.fitted.length;

    switch (zoomRange) {
      case '6m': {
        const start = Math.max(0, historyCount - 180);
        return fullTimeline.slice(start);
      }
      case '1y': {
        const start = Math.max(0, historyCount - 365);
        return fullTimeline.slice(start);
      }
      case '3y': {
        const start = Math.max(0, historyCount - 365 * 3);
        return fullTimeline.slice(start);
      }
      case 'forecast': {
        const start = Math.max(0, historyCount - 60);
        return fullTimeline.slice(start);
      }
      case 'all':
      default:
        return fullTimeline;
    }
  }, [fullTimeline, zoomRange, primaryModel.fitted.length]);

  // Set anomaly lookup map for rapid pinpointing
  const anomalyMap = useMemo(() => {
    const map = new Map<string, AnomalyPoint>();
    if (showAnomalies) {
      anomalies.forEach((a) => map.set(a.date, a));
    }
    return map;
  }, [anomalies, showAnomalies]);

  // Layout bounds
  const padding = { top: 25, right: 30, bottom: 45, left: 55 };
  const chartWidth = Math.max(100, dimensions.width - padding.left - padding.right);
  const chartHeight = Math.max(100, dimensions.height - padding.top - padding.bottom);

  // Min / Max calculation
  const { minVal, maxVal } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    visibleData.forEach((d) => {
      if (d.actual !== undefined) {
        const val = toUnitVal(d.actual);
        if (val < min) min = val;
        if (val > max) max = val;
      }
      const p = toUnitVal(d.primaryPred);
      if (p < min) min = p;
      if (p > max) max = p;

      const lo = toUnitVal(d.lowerCI);
      const hi = toUnitVal(d.upperCI);
      if (lo < min) min = lo;
      if (hi > max) max = hi;

      if (d.comp1Pred !== undefined) {
        const c1 = toUnitVal(d.comp1Pred);
        if (c1 < min) min = c1;
        if (c1 > max) max = c1;
      }
      if (d.comp2Pred !== undefined) {
        const c2 = toUnitVal(d.comp2Pred);
        if (c2 < min) min = c2;
        if (c2 > max) max = c2;
      }
    });

    if (min === Infinity || max === -Infinity) {
      min = 0;
      max = 30;
    }

    const margin = (max - min) * 0.08 || 5;
    return {
      minVal: Math.floor(min - margin),
      maxVal: Math.ceil(max + margin),
    };
  }, [visibleData, tempUnit]);

  // Coordinate scales
  const getX = (index: number) => {
    if (visibleData.length <= 1) return padding.left;
    return padding.left + (index / (visibleData.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const range = maxVal - minVal || 1;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + chartHeight - ((clamped - minVal) / range) * chartHeight;
  };

  // Build SVG paths
  const { actualPath, predHistoryPath, predForecastPath, confidenceAreaPath, comp1Path, comp2Path } =
    useMemo(() => {
      let act = '';
      let prHist = '';
      let prFore = '';
      let confUpper = '';
      let confLower = '';
      let c1 = '';
      let c2 = '';

      let firstHist = true;
      let firstFore = true;

      visibleData.forEach((d, i) => {
        const x = getX(i);
        const yPred = getY(toUnitVal(d.primaryPred));
        const yUpper = getY(toUnitVal(d.upperCI));
        const yLower = getY(toUnitVal(d.lowerCI));

        // Confidence Envelope
        if (i === 0) {
          confUpper = `M ${x} ${yUpper}`;
          confLower = `L ${x} ${yLower}`;
        } else {
          confUpper += ` L ${x} ${yUpper}`;
          confLower = ` L ${x} ${yLower}` + confLower;
        }

        // Actual
        if (d.actual !== undefined) {
          const yAct = getY(toUnitVal(d.actual));
          act += (act === '' ? 'M ' : ' L ') + `${x.toFixed(1)} ${yAct.toFixed(1)}`;
        }

        // Primary Predicted (Hist vs Forecast)
        if (!d.isForecast) {
          if (firstHist) {
            prHist = `M ${x.toFixed(1)} ${yPred.toFixed(1)}`;
            firstHist = false;
          } else {
            prHist += ` L ${x.toFixed(1)} ${yPred.toFixed(1)}`;
          }
        } else {
          if (firstFore) {
            // Bridge from last historical point
            const prev = visibleData[i - 1];
            if (prev) {
              const prevX = getX(i - 1);
              const prevY = getY(toUnitVal(prev.primaryPred));
              prFore = `M ${prevX.toFixed(1)} ${prevY.toFixed(1)} L ${x.toFixed(1)} ${yPred.toFixed(1)}`;
            } else {
              prFore = `M ${x.toFixed(1)} ${yPred.toFixed(1)}`;
            }
            firstFore = false;
          } else {
            prFore += ` L ${x.toFixed(1)} ${yPred.toFixed(1)}`;
          }
        }

        // Comparison Model 1
        if (d.comp1Pred !== undefined) {
          const yC1 = getY(toUnitVal(d.comp1Pred));
          c1 += (c1 === '' ? 'M ' : ' L ') + `${x.toFixed(1)} ${yC1.toFixed(1)}`;
        }

        // Comparison Model 2
        if (d.comp2Pred !== undefined) {
          const yC2 = getY(toUnitVal(d.comp2Pred));
          c2 += (c2 === '' ? 'M ' : ' L ') + `${x.toFixed(1)} ${yC2.toFixed(1)}`;
        }
      });

      const confArea = confUpper ? `${confUpper} ${confLower} Z` : '';

      return {
        actualPath: act,
        predHistoryPath: prHist,
        predForecastPath: prFore,
        confidenceAreaPath: confArea,
        comp1Path: c1,
        comp2Path: c2,
      };
    }, [visibleData, minVal, maxVal, dimensions]);

  // Y-axis grid ticks
  const yTicks = useMemo(() => {
    const count = 5;
    const step = (maxVal - minVal) / count;
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) {
      ticks.push(Math.round(minVal + i * step));
    }
    return ticks;
  }, [minVal, maxVal]);

  // X-axis date labels
  const xTicks = useMemo(() => {
    if (visibleData.length === 0) return [];
    const count = Math.min(6, Math.max(3, Math.floor(chartWidth / 120)));
    const step = Math.floor(visibleData.length / count);
    const ticks: { index: number; label: string; isForecast: boolean }[] = [];
    for (let i = 0; i < visibleData.length; i += step) {
      const d = visibleData[i];
      ticks.push({
        index: i,
        label: d.date,
        isForecast: d.isForecast,
      });
    }
    return ticks;
  }, [visibleData, chartWidth]);

  // Mouse scrub handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || visibleData.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - padding.left;
    const normalized = Math.max(0, Math.min(1, mouseX / chartWidth));
    const idx = Math.round(normalized * (visibleData.length - 1));
    setHoverIndex(idx);
  };

  const activeHoverItem = hoverIndex !== null && visibleData[hoverIndex] ? visibleData[hoverIndex] : null;

  // Split boundary marker
  const splitPointIndex = visibleData.findIndex((d) => d.isTest);
  const forecastStartIndex = visibleData.findIndex((d) => d.isForecast);

  return (
    <div
      id="time-series-chart-card"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl text-slate-200 relative flex flex-col"
    >
      {/* Chart Header & Zoom Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Temperature Time Series & Predictive Fit
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
              {primaryModel.name}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5 font-mono">
            {primaryModel.equation}
          </div>
        </div>

        {/* Zoom Presets */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 self-start sm:self-auto">
          {(
            [
              { id: '6m', label: '6 Mo' },
              { id: '1y', label: '1 Yr' },
              { id: '3y', label: '3 Yr' },
              { id: 'all', label: 'All' },
              { id: 'forecast', label: 'Forecast' },
            ] as const
          ).map((z) => (
            <button
              key={z.id}
              onClick={() => setZoomRange(z.id)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                zoomRange === z.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        className="w-full relative select-none"
        style={{ height: `${dimensions.height}px` }}
      >
        <svg
          id="weather-time-series-svg"
          width="100%"
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          className="cursor-crosshair overflow-visible"
        >
          <defs>
            {/* Confidence Interval Gradient */}
            <linearGradient id="ci-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
            </linearGradient>

            {/* Forecast Shading Gradient */}
            <linearGradient id="forecast-band-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {yTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="3 3"
                  strokeOpacity="0.6"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {val}°
                </text>
              </g>
            );
          })}

          {/* Forecast Zone Background Tint */}
          {forecastStartIndex !== -1 && (
            <rect
              x={getX(forecastStartIndex)}
              y={padding.top}
              width={chartWidth - (getX(forecastStartIndex) - padding.left)}
              height={chartHeight}
              fill="url(#forecast-band-gradient)"
            />
          )}

          {/* Train/Test Split Boundary Line */}
          {splitPointIndex !== -1 && (
            <g>
              <line
                x1={getX(splitPointIndex)}
                y1={padding.top}
                x2={getX(splitPointIndex)}
                y2={padding.top + chartHeight}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity="0.8"
              />
              <text
                x={getX(splitPointIndex) + 5}
                y={padding.top + 14}
                fill="#f59e0b"
                fontSize="10"
                fontWeight="600"
              >
                Test Set Split
              </text>
            </g>
          )}

          {/* Forecast Start Marker */}
          {forecastStartIndex !== -1 && (
            <g>
              <line
                x1={getX(forecastStartIndex)}
                y1={padding.top}
                x2={getX(forecastStartIndex)}
                y2={padding.top + chartHeight}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={getX(forecastStartIndex) + 5}
                y={padding.top + 28}
                fill="#38bdf8"
                fontSize="10"
                fontWeight="600"
              >
                Forecast Horizon
              </text>
            </g>
          )}

          {/* Confidence Interval Shaded Band */}
          {confidenceAreaPath && (
            <path
              d={confidenceAreaPath}
              fill="url(#ci-gradient)"
              stroke="none"
              className="pointer-events-none"
            />
          )}

          {/* Actual Historical Temperature Points / Curve */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="#64748b"
              strokeWidth="1.2"
              strokeOpacity="0.65"
            />
          )}

          {/* Comparison Model 1 (e.g. Linear) */}
          {compareMode && comp1Path && (
            <path
              d={comp1Path}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="4 2"
              strokeOpacity="0.85"
            />
          )}

          {/* Comparison Model 2 (e.g. Polynomial) */}
          {compareMode && comp2Path && (
            <path
              d={comp2Path}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="3 3"
              strokeOpacity="0.85"
            />
          )}

          {/* Primary Model Historical Fitted Curve */}
          {predHistoryPath && (
            <path
              d={predHistoryPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Primary Model Forecast Line (Dashed) */}
          {predForecastPath && (
            <path
              d={predForecastPath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeDasharray="5 3"
              strokeLinecap="round"
            />
          )}

          {/* Anomaly Highlight Circles */}
          {showAnomalies &&
            visibleData.map((d, i) => {
              const anom = anomalyMap.get(d.date);
              if (!anom || d.actual === undefined) return null;
              const cx = getX(i);
              const cy = getY(toUnitVal(d.actual));
              const isHeatwave = anom.type === 'heatwave';

              return (
                <g key={`anom-${d.date}`} className="pointer-events-none">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={anom.severity === 'extreme' ? 6 : 4.5}
                    fill={isHeatwave ? '#ef4444' : '#3b82f6'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
                  {anom.severity === 'extreme' && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="10"
                      fill="none"
                      stroke={isHeatwave ? '#ef4444' : '#3b82f6'}
                      strokeWidth="1"
                      strokeOpacity="0.5"
                    />
                  )}
                </g>
              );
            })}

          {/* X-Axis Ticks */}
          {xTicks.map((t) => {
            const x = getX(t.index);
            return (
              <g key={`xtick-${t.index}`}>
                <line
                  x1={x}
                  y1={padding.top + chartHeight}
                  x2={x}
                  y2={padding.top + chartHeight + 5}
                  stroke="#475569"
                />
                <text
                  x={x}
                  y={padding.top + chartHeight + 18}
                  textAnchor="middle"
                  fill={t.isForecast ? '#38bdf8' : '#94a3b8'}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {t.label}
                </text>
              </g>
            );
          })}

          {/* Active Hover Scrubber Crosshair */}
          {hoverIndex !== null && activeHoverItem && (
            <g className="pointer-events-none">
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + chartHeight}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {activeHoverItem.actual !== undefined && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(toUnitVal(activeHoverItem.actual))}
                  r="4.5"
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
              )}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(toUnitVal(activeHoverItem.primaryPred))}
                r="4.5"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover Floating Card */}
        {hoverIndex !== null && activeHoverItem && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 border border-slate-700/90 rounded-xl p-3 shadow-2xl text-xs backdrop-blur-sm transform -translate-x-1/2"
            style={{
              left: `${Math.min(
                dimensions.width - 110,
                Math.max(110, getX(hoverIndex))
              )}px`,
              top: '10px',
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-mono font-semibold text-slate-200">
                {activeHoverItem.date}
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  activeHoverItem.isForecast
                    ? 'bg-sky-950 text-sky-400 border border-sky-800'
                    : activeHoverItem.isTest
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {activeHoverItem.isForecast
                  ? 'Forecast'
                  : activeHoverItem.isTest
                  ? 'Test Holdout'
                  : 'Training'}
              </span>
            </div>

            <div className="space-y-1">
              {activeHoverItem.actual !== undefined && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Observed:</span>
                  <span className="font-mono font-semibold text-white">
                    {formatTemp(activeHoverItem.actual)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sky-400">Predicted ({primaryModel.name}):</span>
                <span className="font-mono font-semibold text-sky-300">
                  {formatTemp(activeHoverItem.primaryPred)}
                </span>
              </div>
              {activeHoverItem.residual !== undefined && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Residual (Err):</span>
                  <span
                    className={`font-mono font-semibold ${
                      Math.abs(activeHoverItem.residual) > 5
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {activeHoverItem.residual >= 0 ? '+' : ''}
                    {formatTemp(activeHoverItem.residual)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Confidence Band:</span>
                <span className="font-mono">
                  [{formatTemp(activeHoverItem.lowerCI)} – {formatTemp(activeHoverItem.upperCI)}]
                </span>
              </div>

              {/* Anomaly alert inside hover card */}
              {anomalyMap.has(activeHoverItem.date) && (
                <div className="mt-1.5 pt-1.5 border-t border-rose-900/60 flex items-center gap-1.5 text-rose-300 font-semibold text-[10px]">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    Anomaly Detected ({anomalyMap.get(activeHoverItem.date)?.zScore}σ{' '}
                    {anomalyMap.get(activeHoverItem.date)?.type})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 mt-2 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-slate-400 inline-block rounded" />
            <span>Observed Temperatures</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-sky-400 inline-block rounded" />
            <span className="text-slate-200 font-medium">{primaryModel.name} Fit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-sky-600 border-t border-dashed border-sky-300 inline-block" />
            <span>Forecast Horizon</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-sky-600/30 border border-sky-500/50 inline-block rounded-sm" />
            <span>Confidence Interval Envelope</span>
          </div>

          {compareMode && comparisonModels[0] && (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3.5 h-0.5 bg-emerald-400 inline-block" />
              <span>{comparisonModels[0].name}</span>
            </div>
          )}
          {compareMode && comparisonModels[1] && (
            <div className="flex items-center gap-1.5 text-purple-400">
              <span className="w-3.5 h-0.5 bg-purple-400 inline-block" />
              <span>{comparisonModels[1].name}</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-500">
          Showing {visibleData.length} daily time steps
        </div>
      </div>
    </div>
  );
};
