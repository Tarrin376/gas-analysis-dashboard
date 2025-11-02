import { useMemo } from "react";
import { useFetchData } from "../hooks/useFetchData";
import RndPlotWrapper from "../wrappers/RndPlotWrapper.react";

export default function RegressionPlot(bringToFront, minimizeChart, minimizedCharts) {
  const { data, error, loading } = useFetchData("http://127.0.0.1:8000/forecast_storage_regression");
  
  const plotData = useMemo(() => {
    if (!data) {
      return [];
    }

    const traces = [];
    Object.keys(data.scenarios || {}).forEach((k, idx) => {
      const s = data.scenarios[k];
      traces.push({
        x: s.map((d) => d.period),
        y: s.map((d) => d.value),
        type: "scatter",
        mode: "lines",
        name: `Scenario ${k}`,
        line: { color: `hsl(${(idx * 45) % 360},70%,50%)`, width: 2, dash: "dot" },
      });
    });

    if (data.percentiles) {
      traces.push({
        x: data.percentiles.map((d) => d.period),
        y: data.percentiles.map((d) => d.p10),
        type: "scatter",
        mode: "lines",
        line: { width: 0 },
        showlegend: false,
      });

      traces.push({
        x: data.percentiles.map((d) => d.period),
        y: data.percentiles.map((d) => d.p90),
        type: "scatter",
        mode: "lines",
        line: { width: 0 },
        fill: "tonexty",
        fillcolor: "rgba(0,255,0,0.2)",
        name: "6mo 10–90%",
      });

      traces.push({
        x: data.percentiles.map((d) => d.period),
        y: data.percentiles.map((d) => d.p50),
        type: "scatter",
        mode: "lines",
        name: `Median Scenario`,
        line: { color: `hsl(${(45) % 360},70%,50%)`, width: 2, dash: "dot" },
      });
    }

    return traces;
  }, [data]);

  return (
    <RndPlotWrapper 
      id="Storage Regression Forecast" 
      bringToFront={bringToFront} 
      minimizeChart={minimizeChart} 
      minimizedCharts={minimizedCharts} 
      title="Regression Forecast Storage (BCF)" 
      plot={plotData}
      xLabel="Date"
      yLabel="Storage (BCF)"
    />
  )
};