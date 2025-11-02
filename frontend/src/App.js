import { useState } from "react";
import SeasonalPricePlot from "./components/SeasonalPricePlot.react";
import RegressionPlot from "./components/RegressionPlot.react";
import SeasonalStoragePlot from "./components/SeasonalStoragePlot.react";
import PricePlot from "./components/PricePlot.react";
import StoragePlot from "./components/StoragePlot.react";

export default function App() {
  const [minimizedCharts, setMinimizedCharts] = useState([]);
  const [topZ, setTopZ] = useState(1);

  const minimizeChart = (id) =>
    setMinimizedCharts((prev) => [...prev, id]);
  
  const restoreChart = (id) =>
    setMinimizedCharts((prev) => prev.filter((chart) => chart !== id));

  const bringToFront = (id) => {
    const newZ = topZ + 1;
    setTopZ(newZ);
  };

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
      </header>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <PricePlot 
          bringToFront={bringToFront} 
          minimizeChart={minimizeChart} 
          minimizedCharts={minimizedCharts} 
        />
        <SeasonalPricePlot 
          bringToFront={bringToFront} 
          minimizeChart={minimizeChart} 
          minimizedCharts={minimizedCharts} 
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
        <StoragePlot 
          bringToFront={bringToFront} 
          minimizeChart={minimizeChart} 
          minimizedCharts={minimizedCharts} 
        />
        <SeasonalStoragePlot 
          bringToFront={bringToFront} 
          minimizeChart={minimizeChart} 
          minimizedCharts={minimizedCharts} 
        />
      </div>

      <RegressionPlot 
        bringToFront={bringToFront} 
        minimizeChart={minimizeChart} 
        minimizedCharts={minimizedCharts} 
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