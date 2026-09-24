# 🌦️ WeatherTrend AI

**Weather time-series analysis and forecasting in your browser.** Load historical temperature data, fit statistical models, inspect the diagnostics, and project future trends, with an optional AI-written summary of the results.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)

---

## ✨ Features

**Data sources**
- **Preset stations:** London, Phoenix, Tokyo, Sydney, Reykjavik and Denver, each with a distinct climate profile.
- **Live city search:** pick any city and pull real daily history from the [Open-Meteo](https://open-meteo.com/) archive API.
- **CSV upload:** bring your own data. Column names are auto-detected (`date`, `temp`, `tmin`, `tmax`, `precipitation`, and common variants).
- **Synthetic generator:** build a custom climate by tuning base temperature, seasonal amplitude, warming trend, noise and hemisphere.

**Forecasting models** (all implemented from scratch in TypeScript, no ML library)

| Model | Good for |
|---|---|
| Linear regression | Long-term trend baseline |
| Polynomial regression (degree 2–4) | Curved, non-linear trends |
| Harmonic regression | Annual and semi-annual seasonal cycles |
| Holt-Winters | Exponential smoothing with trend and seasonality |
| Moving average | Smoothing noisy daily data |
| Autoregressive (AR) | Short-term persistence using configurable lags |

**Analysis and diagnostics**
- Forecast horizon from 30 days up to 2 years, with **80 / 95 / 99 % confidence bands**
- Configurable **train/test split** for out-of-sample validation
- Metrics: R², adjusted R², RMSE, MAE, MAPE, standard error, **Durbin-Watson** autocorrelation test
- **Trend per decade** and seasonal amplitude
- **Time-series decomposition** into trend, seasonal and residual components
- **Residual analysis** views
- **Anomaly detection** for heatwaves and cold snaps using an adjustable Z-score threshold
- **Compare mode** to overlay several models on the same chart
- °C / °F toggle and exportable forecast table

**AI Insights (optional)**
Sends the computed statistics (not the raw data) to the Gemini API and returns a structured written interpretation covering trend, seasonality, anomalies and practical outlook. The rest of the app works fully without it.

---

## 🚀 Getting Started

**Prerequisites:** Node.js 20 or newer

```bash
# 1. Install dependencies
npm install

# 2. (Optional) enable AI Insights
cp .env.example .env
# then set GEMINI_API_KEY in .env

# 3. Start the dev server
npm run dev
```

Open **http://localhost:3000**.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | No | Enables the AI Insights panel. Without it the endpoint returns a 503 and the UI simply skips the AI summary. |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Express + Vite dev server on port 3000 |
| `npm run build` | Build the frontend and bundle the server into `dist/` |
| `npm start` | Run the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |

---

## 📄 CSV Format

A minimal file only needs a date and a temperature column:

```csv
date,temp,tmin,tmax,precipitation
2024-01-01,4.2,1.1,7.5,0.0
2024-01-02,5.0,2.3,8.1,2.4
```

Accepted date headers: `date`, `time`, `datetime`, `day`, `timestamp`.
Accepted temperature headers include: `temp`, `temperature`, `tmean`, `tavg`, `temperature_2m_mean`.
`tmin`, `tmax` and `precipitation` are optional. If min/max are missing they are estimated from the mean.

---

## 🏗️ Project Structure

```
├── server.ts                  # Express server: API proxies + Vite middleware
├── src/
│   ├── App.tsx                # App state and layout
│   ├── components/            # Chart, model controls, metrics, modals, AI drawer
│   ├── utils/mathRegression.ts# All models, metrics, decomposition, anomaly detection
│   ├── data/presetDatasets.ts # Preset stations, synthetic generator, CSV parser
│   └── types/weather.ts       # Shared TypeScript types
```

### API routes

| Route | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/weather/geocode?q=` | City search (Open-Meteo geocoding) |
| `GET /api/weather/historical` | Daily historical data (Open-Meteo archive) |
| `POST /api/weather/gemini-analysis` | AI summary of model results |

---

## ⚠️ Notes

- The **preset stations use simulated data** (a seasonal cycle, trend, noise and injected extreme events), so they are meant for exploring the models, not for real climate conclusions. Use **City Search** or **CSV upload** for real observations.
- Forecasts are statistical extrapolations and should not be treated as weather predictions.
- The Gemini API key stays on the server and is never exposed to the browser.

---

## 🧰 Tech Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Express · Lucide Icons · Open-Meteo API · Gemini API (optional)
# WeathertrendAI
