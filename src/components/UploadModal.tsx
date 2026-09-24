import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseCSVWeather } from '../data/presetDatasets';
import { WeatherRecord, DatasetMeta } from '../types/weather';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadedDataset: (meta: DatasetMeta, records: WeatherRecord[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onLoadedDataset,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    meta: DatasetMeta;
    records: WeatherRecord[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = (selectedFile: File) => {
    setError(null);
    setPreview(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseCSVWeather(text, selectedFile.name);
        setPreview(result);
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file from disk');
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirm = () => {
    if (!preview) return;
    onLoadedDataset(preview.meta, preview.records);
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
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Import Weather CSV Dataset</h3>
            <p className="text-xs text-slate-400">
              Upload custom time series with Date and Temperature columns.
            </p>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-sky-500 bg-slate-800/40 hover:bg-slate-800/70 rounded-2xl p-8 text-center cursor-pointer transition-colors mb-4"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            accept=".csv,.txt"
            className="hidden"
          />
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-sky-400 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <div className="text-xs font-semibold text-slate-200">
            {file ? file.name : 'Click to browse or drop weather CSV here'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Supports standard CSV formats (date, temperature, temp_min, temp_max)
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Preview Confirmation */}
        {preview && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3.5 mb-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Valid Weather Time Series Detected
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-300 mt-2 text-[11px]">
              <div>
                <span className="text-slate-500">Record Count:</span>{' '}
                <strong className="text-white">{preview.records.length} days</strong>
              </div>
              <div>
                <span className="text-slate-500">Time Range:</span>{' '}
                <strong className="text-white">
                  {preview.records[0].date} to {preview.records[preview.records.length - 1].date}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Mean Temp:</span>{' '}
                <strong className="text-white">
                  {(
                    preview.records.reduce((a, b) => a + b.tempMean, 0) /
                    preview.records.length
                  ).toFixed(1)}
                  °C
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Min / Max Range:</span>{' '}
                <strong className="text-white">
                  {Math.min(...preview.records.map((r) => r.tempMin)).toFixed(1)}°C to{' '}
                  {Math.max(...preview.records.map((r) => r.tempMax)).toFixed(1)}°C
                </strong>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!preview}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
          >
            Load Dataset & Run Regression
          </button>
        </div>
      </div>
    </div>
  );
};
