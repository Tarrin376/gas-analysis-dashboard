import { useEffect, useState } from "react";
import axios from "axios";
import RndPlotWrapper from "./components/RndPlotWrapper.react";

export default function App() {
  const [priceData, setPriceData] = useState([]);
  const [seasonalPriceData, setSeasonalPriceData] = useState(null);
  const [storageData, setStorageData] = useState([]);
  const [seasonalStorageData, setSeasonalStorageData] = useState(null);
  const [forecastStorageData, setForecastStorageData] = useState(null);
  const [forecastRegressionData, setForecastRegressionData] = useState(null);
  const [minimizedCharts, setMinimizedCharts] = useState([]);

  const [topZ, setTopZ] = useState(1);

  // ------------------------- DATA FETCH -------------------------
  const fetchData = async () => {
    try {
      const [
        prices,
        seasonalPrices,
        storage,
        seasonalStorage,
        forecast,
        regression,
      ] = await Promise.all([
        axios.get("http://127.0.0.1:8000/prices"),
        axios.get("http://127.0.0.1:8000/seasonal_prices"),
        axios.get("http://127.0.0.1:8000/storage"),
        axios.get("http://127.0.0.1:8000/seasonal_storage"),
        axios.get("http://127.0.0.1:8000/forecast_storage_monte_carlo"),
        axios.get("http://127.0.0.1:8000/forecast_storage_regression"),
      ]);

      setPriceData(
        (prices.data || []).sort(
          (a, b) => new Date(a.period) - new Date(b.period)
        )
      );
      setSeasonalPriceData(seasonalPrices.data || null);
      setStorageData(
        (storage.data || []).sort(
          (a, b) => new Date(a.period) - new Date(b.period)
        )
      );
      setSeasonalStorageData(seasonalStorage.data || null);
      setForecastStorageData(forecast.data || null);
      setForecastRegressionData(regression.data || null);
    } catch (err) {
      console.error("Error fetching data", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (
    !priceData.length ||
    !seasonalPriceData ||
    !storageData.length ||
    !seasonalStorageData
  ) {
    return <div style={{ color: "#fff", padding: 40 }}>Loading...</div>;
  }

  // ------------------------- PLOT HELPERS -------------------------
  const renderMainPlot = (data, yLabel, color = "#00b4d8") => ({
    x: data.map((d) => d.period),
    y: data.map((d) => d.value),
    type: "scatter",
    mode: "lines",
    line: { color, width: 2 },
    hovertemplate: `<b>Date:</b> %{x}<br><b>${yLabel}:</b> %{y:.2f}<extra></extra>`,
  });

  const renderSeasonalPricePlot = (seasonalData, yLabel) => {
    const traces = [];

    if (seasonalData.historical_years) {
      Object.entries(seasonalData.historical_years).forEach(([year, arr]) => {
        traces.push({
          x: arr.map((d) => d.period),
          y: arr.map((d) => d.value),
          type: "scatter",
          mode: "lines",
          name: `${year}`,
          line: { width: 1.2 },
          opacity: 0.45,
        });
      });
    }

    traces.push({
      x: seasonalData.current_year.map((d) => d.period),
      y: seasonalData.current_year.map((d) => d.value),
      type: "scatter",
      mode: "lines",
      name: "Current Year",
      line: { color: "#00b4d8", width: 2.4 },
    });

    if (seasonalData.historical_avg) {
      traces.push({
        x: seasonalData.historical_avg.map((d) => d.period),
        y: seasonalData.historical_avg.map((d) => d.value),
        type: "scatter",
        mode: "lines",
        name: "5-Year Avg",
        line: { color: "#f48c06", width: 2, dash: "dash" },
      });

      if (seasonalData.historical_avg[0]?.p25 !== undefined) {
        traces.push({
          x: seasonalData.historical_avg.map((d) => d.period),
          y: seasonalData.historical_avg.map((d) => d.p25),
          type: "scatter",
          mode: "lines",
          line: { width: 0 },
          showlegend: false,
        });
        traces.push({
          x: seasonalData.historical_avg.map((d) => d.period),
          y: seasonalData.historical_avg.map((d) => d.p75),
          type: "scatter",
          mode: "lines",
          line: { width: 0 },
          fill: "tonexty",
          fillcolor: "rgba(244,140,6,0.12)",
          name: "5yr 25–75%",
        });
      }
    }

    return traces;
  };

  const renderSeasonalStoragePlot = (seasonalData, yLabel) => {
    const traces = [];

    if (seasonalData.historical_years) {
      Object.entries(seasonalData.historical_years).forEach(([year, arr]) => {
        traces.push({
          x: arr.map((d) => d.period),
          y: arr.map((d) => d.value),
          type: "scatter",
          mode: "lines",
          name: `${year}`,
          line: { width: 1.2 },
          opacity: 0.6,
        });
      });
    }

    traces.push({
      x: seasonalData.current_year.map((d) => d.period),
      y: seasonalData.current_year.map((d) => d.value),
      type: "scatter",
      mode: "lines",
      name: "Current Year",
      line: { color: "#f48c06", width: 2.4 },
    });

    if (seasonalData.historical_avg) {
      traces.push({
        x: seasonalData.historical_avg.map((d) => d.period),
        y: seasonalData.historical_avg.map((d) => d.value),
        type: "scatter",
        mode: "lines",
        name: "5-Year Avg",
        line: { color: "#00b4d8", width: 2, dash: "dash" },
      });

      if (seasonalData.historical_avg[0]?.p25 !== undefined) {
        traces.push({
          x: seasonalData.historical_avg.map((d) => d.period),
          y: seasonalData.historical_avg.map((d) => d.p25),
          type: "scatter",
          mode: "lines",
          line: { width: 0 },
          showlegend: false,
        });
        traces.push({
          x: seasonalData.historical_avg.map((d) => d.period),
          y: seasonalData.historical_avg.map((d) => d.p75),
          type: "scatter",
          mode: "lines",
          line: { width: 0 },
          fill: "tonexty",
          fillcolor: "rgba(0,180,216,0.12)",
          name: "5yr 25–75%",
        });
      }
    }

    if (forecastStorageData?.percentiles) {
      const perc = forecastStorageData.percentiles;
      traces.push({
        x: perc.map((d) => d.period),
        y: perc.map((d) => d.p10),
        type: "scatter",
        mode: "lines",
        line: { width: 0 },
        showlegend: false,
      });
      traces.push({
        x: perc.map((d) => d.period),
        y: perc.map((d) => d.p90),
        type: "scatter",
        mode: "lines",
        line: { width: 0 },
        fill: "tonexty",
        fillcolor: "rgba(244,140,6,0.20)",
        showlegend: false,
      });
      traces.push({
        x: perc.map((d) => d.period),
        y: perc.map((d) => d.p50),
        type: "scatter",
        mode: "lines",
        line: { color: "#f48c06", width: 2, dash: "dot" },
        name: "Forecast Median",
      });
    }

    return traces;
  };

  const renderRegressionPlot = () => {
    if (!forecastRegressionData) return [];
    const traces = [];

    Object.keys(forecastRegressionData.scenarios || {}).forEach((k, idx) => {
      const s = forecastRegressionData.scenarios[k];
      traces.push({
        x: s.map((d) => d.period),
        y: s.map((d) => d.value),
        type: "scatter",
        mode: "lines",
        name: `Scenario ${k}`,
        line: { color: `hsl(${(idx * 45) % 360},70%,50%)`, width: 2, dash: "dot" },
      });
    });

    if (forecastRegressionData.percentiles) {
      traces.push({
        x: forecastRegressionData.percentiles.map((d) => d.period),
        y: forecastRegressionData.percentiles.map((d) => d.p10),
        type: "scatter",
        mode: "lines",
        line: { width: 0 },
        showlegend: false,
      });
      traces.push({
        x: forecastRegressionData.percentiles.map((d) => d.period),
        y: forecastRegressionData.percentiles.map((d) => d.p90),
        type: "scatter",
        mode: "lines",
        line: { width: 0 },
        fill: "tonexty",
        fillcolor: "rgba(0,255,0,0.2)",
        name: "6mo 10–90%",
      });
    traces.push({
        x: forecastRegressionData.percentiles.map((d) => d.period),
        y: forecastRegressionData.percentiles.map((d) => d.p50),
        type: "scatter",
        mode: "lines",
        name: `Median Scenario`,
        line: { color: `hsl(${(45) % 360},70%,50%)`, width: 2, dash: "dot" },
      });

    }

    return traces;
  };

  // ------------------------- MINIMIZE / RESTORE -------------------------
  const minimizeChart = (id) =>
    setMinimizedCharts((prev) => [...prev, id]);
  const restoreChart = (id) =>
    setMinimizedCharts((prev) => prev.filter((chart) => chart !== id));

  const bringToFront = (id) => {
    const newZ = topZ + 1;
    setTopZ(newZ);
  };

  // ------------------------- MAIN RENDER -------------------------
  return (
    <div
      style={{
        background: "#0d1117",
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
        padding: 24,
        position: "relative",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1 style={{ color: "#00b4d8", fontWeight: "700", fontSize: "1.8rem" }}>
          Natural Gas Dashboard
        </h1>
        <button
          onClick={fetchData}
          style={{
            background: "#00b4d8",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Refresh Data
        </button>
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <RndPlotWrapper 
          id="Price Plot" 
          bringToFront={bringToFront} 
          minimizeChart={minimizeChart} 
          minimizedCharts={minimizedCharts} 
          title="Henry Hub Natural Gas Spot Price ($/MMBtu)" 
          plot={renderMainPlot(priceData, "Price ($/MMBtu)")}
          xLabel="Date"
          yLabel="Price ($/MMBtu)"
        />
        <RndPlotWrapper 
          id="Seasonal Price Plot" 
          bringToFront={bringToFront} 
          minimizeChart={minimizeChart} 
          minimizedCharts={minimizedCharts} 
          title="Seasonal — Current Year vs Historical (Price)" 
          plot={renderSeasonalPricePlot(seasonalPriceData, "Price ($/MMBtu)")}
          xLabel="Date"
          yLabel="Price ($/MMBtu)"
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
        <RndPlotWrapper 
          id="Storage Plot" 
          bringToFront={bringToFront} 
          minimizeChart={minimizeChart} 
          minimizedCharts={minimizedCharts} 
          title="US Natural Gas Storage (BCF) — Actual" 
          plot={renderMainPlot(storageData, "Storage (BCF)", "#f48c06")}
          xLabel="Date"
          yLabel="Storage (BCF)"
        />
        <RndPlotWrapper 
          id="Seasonal Storage Plot" 
          bringToFront={bringToFront} 
          minimizeChart={minimizeChart} 
          minimizedCharts={minimizedCharts} 
          title="Seasonal — Current Year, Historical Years & Monte Carlo Forecast (Storage)" 
          plot={renderSeasonalStoragePlot(seasonalStorageData, "Storage (BCF)")}
          xLabel="Date"
          yLabel="Storage (BCF)"
        />
      </div>
        
      <RndPlotWrapper 
        id="Storage Regression Forecast" 
        bringToFront={bringToFront} 
        minimizeChart={minimizeChart} 
        minimizedCharts={minimizedCharts} 
        title="Regression Forecast Storage (BCF)" 
        plot={renderRegressionPlot()}
        xLabel="Date"
        yLabel="Storage (BCF)"
      />

      {minimizedCharts.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#111",
            borderTop: "1px solid #333",
            padding: "10px 16px",
            display: "flex",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          {minimizedCharts.map((id) => (
            <button
              key={id}
              onClick={() => restoreChart(id)}
              style={{
                background: "#00b4d8",
                border: "none",
                borderRadius: "8px",
                padding: "6px 12px",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
