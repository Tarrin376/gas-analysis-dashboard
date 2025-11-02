import { useMemo } from "react";
import RndPlotWrapper from "../wrappers/RndPlotWrapper.react";
import { useFetchData } from "../hooks/useFetchData";

export default function SeasonalPricePlot(bringToFront, minimizeChart, minimizedCharts) {
  const { data, error, loading } = useFetchData("http://127.0.0.1:8000/seasonal_prices");

  const plotData = useMemo(() => {
    if (!data) {
      return [];
    }

    const traces = [];
    if (data.historical_years) {
      Object.entries(data.historical_years).forEach(([year, arr]) => {
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
      x: data.current_year.map((d) => d.period),
      y: data.current_year.map((d) => d.value),
      type: "scatter",
      mode: "lines",
      name: "Current Year",
      line: { color: "#00b4d8", width: 2.4 },
    });

    if (data.historical_avg) {
      traces.push({
        x: data.historical_avg.map((d) => d.period),
        y: data.historical_avg.map((d) => d.value),
        type: "scatter",
        mode: "lines",
        name: "5-Year Avg",
        line: { color: "#f48c06", width: 2, dash: "dash" },
      });

      if (data.historical_avg[0]?.p25 !== undefined) {
        traces.push({
          x: data.historical_avg.map((d) => d.period),
          y: data.historical_avg.map((d) => d.p25),
          type: "scatter",
          mode: "lines",
          line: { width: 0 },
          showlegend: false,
        });

        traces.push({
          x: data.historical_avg.map((d) => d.period),
          y: data.historical_avg.map((d) => d.p75),
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
  }, [data]);

  return (
    <RndPlotWrapper 
      id="Seasonal Price Plot" 
      bringToFront={bringToFront} 
      minimizeChart={minimizeChart} 
      minimizedCharts={minimizedCharts} 
      title="Seasonal — Current Year vs Historical (Price)" 
      plot={plotData}
      xLabel="Date"
      yLabel="Price ($/MMBtu)"
    />
  )
};