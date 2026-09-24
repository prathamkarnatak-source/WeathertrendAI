import React, { useState, useMemo } from 'react';
import {
  WeatherRecord,
  DatasetMeta,
  ModelConfig,
  RegressionModelOutput,
  ModelType,
} from './types/weather';
import { PRESET_DATASETS } from './data/presetDatasets';
import {
  fitModel,
  decomposeTimeSeries,
  detectAnomalies,
} from './utils/mathRegression';
import { Navbar } from './components/Navbar';
import { ModelControlPanel } from './components/ModelControlPanel';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { MetricsCardGrid } from './components/MetricsCardGrid';
import { DecompositionView } from './components/DecompositionView';
import { ResidualAnalysisView } from './components/ResidualAnalysisView';
import { AnomaliesList } from './components/AnomaliesList';
import { CitySearchModal } from './components/CitySearchModal';
import { UploadModal } from './components/UploadModal';
import { SyntheticGeneratorModal } from './components/SyntheticGeneratorModal';
import { ForecastTableModal } from './components/ForecastTableModal';
import { AiAnalysisDrawer } from './components/AiAnalysisDrawer';
import {
  LineChart,
  Layers,
  BarChart3,
  AlertTriangle,
  Table,
  Info,
  Calendar,
  Compass,
} from 'lucide-react';

export default function App() {
  // 1. Dataset State (default to London Heathrow preset)
  const [activePresetId, setActivePresetId] = useState<string>('london-heathrow');
  const [currentMeta, setCurrentMeta] = useState<DatasetMeta>(PRESET_DATASETS[0].meta);
  const [records, setRecords] = useState<WeatherRecord[]>(() =>
    PRESET_DATASETS[0].generateRecords()
  );

  // 2. Unit Preference (°C or °F)
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');

  // 3. Regression Model Configuration
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    type: 'harmonic',
    polyDegree: 2,
    maWindow: 30,
    holtAlpha: 0.2,
    holtBeta: 0.05,
    arLags: [1, 7],
    forecastDays: 180,
    trainTestSplitRatio: 1.0, // 1.0 = fit on full history; slider can move to 0.8 (80/20)
    confidenceLevel: 0.95,
  });

  // 4. Analysis Toggles
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);
  const [anomalyThreshold, setAnomalyThreshold] = useState<number>(2.0);

  // 5. Active View Mode
  const [activeTab, setActiveTab] = useState<'chart' | 'decomposition' | 'residuals' | 'anomalies'>(
    'chart'
  );

  // 6. Modals & Drawer State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [syntheticModalOpen, setSyntheticModalOpen] = useState(false);
  const [forecastTableOpen, setForecastTableOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // 7. Select preset
  const handleSelectPreset = (id: string) => {
    const found = PRESET_DATASETS.find((p) => p.meta.id === id);
    if (found) {
      setActivePresetId(id);
      setCurrentMeta(found.meta);
      setRecords(found.generateRecords());
    }
  };

  // 8. Load external dataset (Open-Meteo or Upload or Synthetic)
  const handleLoadedDataset = (newMeta: DatasetMeta, newRecords: WeatherRecord[]) => {
    setActivePresetId(newMeta.id);
    setCurrentMeta(newMeta);
    setRecords(newRecords);
  };

  // 9. Compute Primary Regression Model Output
  const primaryModel: RegressionModelOutput = useMemo(() => {
    return fitModel(records, modelConfig);
  }, [records, modelConfig]);

  // 10. Compute Comparison Models when Compare Mode is enabled
  const comparisonModels: RegressionModelOutput[] = useMemo(() => {
    if (!compareMode) return [];

    const alternatives: ModelType[] =
      modelConfig.type === 'harmonic'
        ? ['linear', 'polynomial']
        : modelConfig.type === 'linear'
        ? ['harmonic', 'polynomial']
        : ['harmonic', 'linear'];

    return alternatives.map((altType) =>
      fitModel(records, { ...modelConfig, type: altType })
    );
  }, [records, modelConfig, compareMode]);

  // 11. Compute Additive Time Series Decomposition
  const decomposition = useMemo(() => {
    return decomposeTimeSeries(records);
  }, [records]);

  // 12. Compute Extreme Anomalies
  const anomalies = useMemo(() => {
    return detectAnomalies(primaryModel.fitted, anomalyThreshold);
  }, [primaryModel.fitted, anomalyThreshold]);

  // Split point for index calculation
  const splitIndex = Math.floor(
    records.length * Math.min(1.0, Math.max(0.2, modelConfig.trainTestSplitRatio))
  );

  // Export Complete Analysis Data
  const handleExportData = () => {
    const headers = [
      'Date',
      'DayIndex',
      'Observed_Mean_C',
      'Observed_Min_C',
      'Observed_Max_C',
      'Model_Predicted_C',
      'Residual_C',
      'Lower_CI_C',
      'Upper_CI_C',
      'Is_Test_Holdout',
    ];

    const rows = primaryModel.fitted.map((f, i) => [
      f.date,
      f.dayIndex,
      f.actual,
      records[i]?.tempMin ?? '',
      records[i]?.tempMax ?? '',
      f.predicted,
      f.residual,
      f.lowerCI,
      f.upperCI,
      f.isTest ? '1' : '0',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `weather_regression_${currentMeta.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentMeta={currentMeta}
        onSelectPreset={handleSelectPreset}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenSynthetic={() => setSyntheticModalOpen(true)}
        onToggleAi={() => setAiDrawerOpen(!aiDrawerOpen)}
        isAiDrawerOpen={aiDrawerOpen}
        tempUnit={tempUnit}
        onToggleUnit={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
        onExportData={handleExportData}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Station Metadata & Key Insight Bar */}
        <div
          id="station-info-banner"
          className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {currentMeta.name}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-sky-400 border border-slate-700">
                {currentMeta.climateType}
              </span>
              <span className="text-[11px] text-slate-400">
                {currentMeta.location} ({currentMeta.latitude.toFixed(2)}°,{' '}
                {currentMeta.longitude.toFixed(2)}° • {currentMeta.elevation}m ASL)
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              {currentMeta.description}
            </p>
          </div>

          {/* Quick Schedule / Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="view-forecast-table-btn"
              onClick={() => setForecastTableOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <Table className="w-3.5 h-3.5 text-sky-400" />
              <span>Forecast Table ({modelConfig.forecastDays}d)</span>
            </button>
          </div>
        </div>

        {/* Regression Configuration & Modeling Panel */}
        <ModelControlPanel
          config={modelConfig}
          onChangeConfig={(newCfg) => setModelConfig((prev) => ({ ...prev, ...newCfg }))}
          compareMode={compareMode}
          onToggleCompareMode={() => setCompareMode(!compareMode)}
          showAnomalies={showAnomalies}
          onToggleAnomalies={() => setShowAnomalies(!showAnomalies)}
          anomalyThreshold={anomalyThreshold}
          onChangeAnomalyThreshold={setAnomalyThreshold}
          totalRecordsCount={records.length}
        />

        {/* Statistical Evaluation Metrics Grid */}
        <MetricsCardGrid
          metrics={primaryModel.metrics}
          modelName={primaryModel.name}
          tempUnit={tempUnit}
          isSplitEnabled={modelConfig.trainTestSplitRatio < 1.0}
        />

        {/* Analysis View Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            id="tab-chart"
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'chart'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>Time Series & Forecast Chart</span>
          </button>

          <button
            id="tab-decomposition"
            onClick={() => setActiveTab('decomposition')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'decomposition'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Additive Decomposition</span>
          </button>

          <button
            id="tab-residuals"
            onClick={() => setActiveTab('residuals')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'residuals'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Residual Diagnostics</span>
          </button>

          <button
            id="tab-anomalies"
            onClick={() => setActiveTab('anomalies')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'anomalies'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Anomalies Feed ({anomalies.length})</span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'chart' && (
          <TimeSeriesChart
            primaryModel={primaryModel}
            comparisonModels={comparisonModels}
            compareMode={compareMode}
            anomalies={anomalies}
            showAnomalies={showAnomalies}
            tempUnit={tempUnit}
            splitIndex={splitIndex}
          />
        )}

        {activeTab === 'decomposition' && (
          <DecompositionView decomposition={decomposition} tempUnit={tempUnit} />
        )}

        {activeTab === 'residuals' && (
          <ResidualAnalysisView
            fittedPoints={primaryModel.fitted}
            tempUnit={tempUnit}
          />
        )}

        {activeTab === 'anomalies' && (
          <AnomaliesList
            anomalies={anomalies}
            tempUnit={tempUnit}
            thresholdZ={anomalyThreshold}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 py-4 text-slate-500 text-xs text-center mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Weather Data Analysis and Prediction System • Time Series & Empirical Regression Workbench
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            {records.length} Daily Records • {currentMeta.startDate} to {currentMeta.endDate}
          </div>
        </div>
      </footer>

      {/* Modals & Slide-over Drawer */}
      <CitySearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onLoadedDataset={handleLoadedDataset}
      />

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onLoadedDataset={handleLoadedDataset}
      />

      <SyntheticGeneratorModal
        isOpen={syntheticModalOpen}
        onClose={() => setSyntheticModalOpen(false)}
        onLoadedDataset={handleLoadedDataset}
      />

      <ForecastTableModal
        isOpen={forecastTableOpen}
        onClose={() => setForecastTableOpen(false)}
        forecastPoints={primaryModel.forecast}
        modelName={primaryModel.name}
        tempUnit={tempUnit}
      />

      <AiAnalysisDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        datasetMeta={currentMeta}
        activeModel={primaryModel}
        anomaliesCount={anomalies.length}
        tempUnit={tempUnit}
      />
    </div>
  );
}
