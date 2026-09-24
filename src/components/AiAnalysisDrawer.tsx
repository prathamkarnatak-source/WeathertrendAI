import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  BrainCircuit,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { RegressionModelOutput, DatasetMeta } from '../types/weather';

interface AiAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  datasetMeta: DatasetMeta;
  activeModel: RegressionModelOutput;
  anomaliesCount: number;
  tempUnit: 'C' | 'F';
}

export const AiAnalysisDrawer: React.FC<AiAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  datasetMeta,
  activeModel,
  anomaliesCount,
  tempUnit,
}) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchAiAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        datasetName: datasetMeta.name,
        location: datasetMeta.location,
        climateType: datasetMeta.climateType,
        recordCount: activeModel.fitted.length,
        startDate: datasetMeta.startDate,
        endDate: datasetMeta.endDate,
        activeModel: {
          name: activeModel.name,
          equation: activeModel.equation,
          type: activeModel.type,
        },
        metrics: {
          r2: activeModel.metrics.r2,
          adjustedR2: activeModel.metrics.adjustedR2,
          rmse: activeModel.metrics.rmse,
          mae: activeModel.metrics.mae,
          testR2: activeModel.metrics.testR2,
        },
        trendPerDecade: activeModel.metrics.trendPerDecade,
        seasonalAmplitude: activeModel.metrics.annualAmplitude,
        anomaliesCount,
      };

      const res = await fetch('/api/weather/gemini-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Server error occurred during AI analysis');
      }

      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysis && !loading) {
      fetchAiAnalysis();
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-700 h-full shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">AI Climatological Insights</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Gemini Meteorological Diagnostic Synthesis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {analysis && (
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Copy markdown analysis"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={fetchAiAnalysis}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Regenerate analysis"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed text-slate-300">
          {/* Summary Banner */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/70 text-xs">
            <div className="font-semibold text-white mb-1.5 flex items-center justify-between">
              <span>{datasetMeta.name}</span>
              <span className="text-[10px] font-mono text-sky-400 font-normal">
                {activeModel.name}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono">
              <div>
                R² Fit:{' '}
                <strong className="text-white">
                  {(activeModel.metrics.r2 * 100).toFixed(1)}%
                </strong>
              </div>
              <div>
                RMSE:{' '}
                <strong className="text-white">
                  {activeModel.metrics.rmse.toFixed(1)}°C
                </strong>
              </div>
              <div>
                Decadal Trend:{' '}
                <strong className="text-amber-400">
                  {activeModel.metrics.trendPerDecade >= 0 ? '+' : ''}
                  {activeModel.metrics.trendPerDecade.toFixed(2)}°C
                </strong>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
              <div className="text-xs font-medium text-slate-300">
                Evaluating empirical regression coefficients...
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs text-center">
                Synthesizing decadal trend rates, Fourier seasonal amplitude, and synoptic anomaly risk factors.
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>AI Service Notice</span>
              </div>
              <p className="text-[11px] text-rose-200/90">{error}</p>
              <button
                onClick={fetchAiAnalysis}
                className="self-start mt-1 px-3 py-1 bg-rose-900/80 hover:bg-rose-800 rounded-lg text-[11px] font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : analysis ? (
            <div className="prose prose-invert prose-xs max-w-none space-y-3">
              {/* Parse sections or render markdown blocks */}
              <div className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">
                {analysis}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-[11px] text-slate-500">
          <span>Model: Gemini 3.8 Flash (Server-Side)</span>
          <span>Climatological Assessment</span>
        </div>
      </div>
    </div>
  );
};
