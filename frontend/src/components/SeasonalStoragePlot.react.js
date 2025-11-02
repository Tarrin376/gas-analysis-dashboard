import { useMemo } from "react";
import { useFetchData } from "../hooks/useFetchData";
import RndPlotWrapper from "../wrappers/RndPlotWrapper.react";

export default function SeasonalStoragePlot(bringToFront, minimizeChart, minimizedCharts) {
  const { data: seasonalData, error: seasonalError, loading: seasonalLoading } = useFetchData("http://127.0.0.1:8000/seasonal_storage");
  const { data: forecastData, error: forecastError, loaing: forcecastLoading } = useFetchData("http://127.0.0.1:8000/forecast_storage_monte_carlo");

  const plotData = useMemo(() => {
    const data = [];

    if (seasonalData.historical_years) {
      Object.entries(seasonalData.historical_years).forEach(([year, arr]) => {
        data.push({
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

    data.push({
      x: seasonalData.current_year.map((d) => d.period),
      y: seasonalData.current_year.map((d) => d.value),
      type: "scatter",
      mode: "lines",
      name: "Current Year",
      line: { color: "#f48c06", width: 2.4 },
    });

    if (seasonalData.historical_avg) {
      data.push({
        x: seasonalData.historical_avg.map((d) => d.period),
        y: seasonalData.historical_avg.map((d) => d.value),
        type: "scatter",
        mode: "lines",
        name: "5-Year Avg",
        line: { color: "#00b4d8", width: 2, dash: "dash" },
      });

      if (seasonalData.historical_avg[0]?.p25 !== undefined) {
        data.push({
          x: seasonalData.historical_avg.map((d) => d.period),
          y: seasonalData.historical_avg.map((d) => d.p25),
          type: "scatter",
          mode: "lines",
          line: { width: 0 },
          showlegend: false,
        });
        data.push({
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

    if (forecastData?.percentiles) {
      const perc = forecastData.percentiles;
      data.push({
        x: perc.map((d) => d.period),
        y: perc.map((d) => d.p10),
        type: "scatter",
        mode: "lines",
        line: { width: 0 },
        showlegend: false,
      });

      data.push({
        x: perc.map((d) => d.period),
        y: perc.map((d) => d.p90),
        type: "scatter",
        mode: "lines",
        line: { width: 0 },
        fill: "tonexty",
        fillcolor: "rgba(244,140,6,0.20)",
        showlegend: false,
      });

      data.push({
        x: perc.map((d) => d.period),
        y: perc.map((d) => d.p50),
        type: "scatter",
        mode: "lines",
        line: { color: "#f48c06", width: 2, dash: "dot" },
        name: "Forecast Median",
      });
    }

    return data;
  }, [seasonalData, forecastData]);

  <RndPlotWrapper 
    id="Seasonal Storage Plot" 
    bringToFront={bringToFront} 
    minimizeChart={minimizeChart} 
    minimizedCharts={minimizedCharts} 
    title="Seasonal — Current Year, Historical Years & Monte Carlo Forecast (Storage)" 
    plot={plotData}
    xLabel="Date"
    yLabel="Storage (BCF)"
  />
};