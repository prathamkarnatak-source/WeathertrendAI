import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initializer for Gemini API client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Health check route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Geocoding proxy for Open-Meteo search
app.get("/api/weather/geocode", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Missing query parameter 'q'" });
    }
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    );
    if (!response.ok) {
      return res.status(response.status).json({ error: "Geocoding service unavailable" });
    }
    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Geocode error:", error);
    return res.status(500).json({ error: error.message || "Failed to geocode location" });
  }
});

// Proxy for Open-Meteo historical/archive data
app.get("/api/weather/historical", async (req, res) => {
  try {
    const { latitude, longitude, start_date, end_date } = req.query;
    if (!latitude || !longitude || !start_date || !end_date) {
      return res.status(400).json({ error: "Missing required parameters (latitude, longitude, start_date, end_date)" });
    }
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${start_date}&end_date=${end_date}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,windspeed_10m_max,shortwave_radiation_sum&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Archive API error: ${errText}` });
    }
    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Historical weather error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch historical weather" });
  }
});

// AI analysis and interpretation endpoint using Gemini
app.post("/api/weather/gemini-analysis", async (req, res) => {
  try {
    const {
      datasetName,
      location,
      climateType,
      recordCount,
      startDate,
      endDate,
      activeModel,
      metrics,
      trendPerDecade,
      seasonalAmplitude,
      anomaliesCount,
      forecastHighlights,
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured in this environment.",
        fallback: true,
      });
    }

    const prompt = `You are an expert Meteorological Data Scientist and Climatologist. Analyze the following empirical weather time series regression analysis and provide a professional, structured scientific summary.

DATASET INFORMATION:
- Location / Station: ${datasetName || location || "Weather Station"}
- Climate Classification: ${climateType || "Temperate"}
- Time Range: ${startDate} to ${endDate} (${recordCount} daily observations)

MODEL SPECIFICATION & REGRESSION RESULTS:
- Active Model: ${activeModel?.name || "Linear Regression"} (${activeModel?.equation || ""})
- Goodness-of-Fit (R² Score): ${metrics?.r2 !== undefined ? (metrics.r2 * 100).toFixed(2) + "%" : "N/A"}
- Root Mean Squared Error (RMSE): ${metrics?.rmse !== undefined ? metrics.rmse.toFixed(2) + " °C" : "N/A"}
- Mean Absolute Error (MAE): ${metrics?.mae !== undefined ? metrics.mae.toFixed(2) + " °C" : "N/A"}
- Test Set Out-of-Sample R²: ${metrics?.testR2 !== undefined ? (metrics.testR2 * 100).toFixed(2) + "%" : "N/A"}
- Secular Linear Trend: ${trendPerDecade !== undefined ? (trendPerDecade > 0 ? "+" : "") + trendPerDecade.toFixed(2) + " °C per decade" : "N/A"}
- Seasonal Cycle Peak-to-Trough Amplitude: ${seasonalAmplitude !== undefined ? seasonalAmplitude.toFixed(2) + " °C" : "N/A"}
- Statistical Residual Anomalies Detected (|Z| > 2.0): ${anomaliesCount ?? 0}
- Near-term Predicted Mean Temperature: ${forecastHighlights || "Projected trend aligns with seasonal regression envelope"}

Provide an insightful, concise report structured in clean Markdown with the following 4 sections:
1. ### 🌡️ Secular Trend & Decadal Rate
   Interpret the long-term trend rate, its statistical robustness, and whether it signifies noticeable warming or regional cooling.
2. ### 🔄 Seasonality & Model Fit Evaluation
   Critique the active regression model (${activeModel?.name}). Discuss how well it captures the annual sinusoidal cycle versus high-frequency noise. Mention if residual autocorrelation or non-linear effects are present.
3. ### ⚠️ Extreme Anomalies & Residual Analysis
   Assess the significance of the ${anomaliesCount ?? 0} anomalous events and what synoptic weather patterns (blocking highs, polar vortex intrusions, atmospheric rivers) typically cause such residual spikes.
4. ### 🔮 Predictive Outlook & Practical Implications
   Synthesize the forward projection for regional agriculture, energy demand (cooling/heating degree days), and climate adaptation.

Keep tone objective, authoritative, scientifically rigorous, yet clear and accessible. Do not use generic filler.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a distinguished Senior Meteorological Data Scientist who writes precise, mathematically grounded climate diagnostics.",
        temperature: 0.4,
      },
    });

    const analysisText = response.text || "No analysis generated.";
    return res.json({ analysis: analysisText });
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate AI analysis" });
  }
});

// Vite middleware or static serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
