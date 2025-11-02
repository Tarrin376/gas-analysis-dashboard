import { useMemo } from "react";
import { useFetchData } from "../hooks/useFetchData";
import RndPlotWrapper from "../wrappers/RndPlotWrapper.react";
import { getGenericPlotData } from "../utils/getGenericPlotData";

export default function StoragePlot(bringToFront, minimizeChart, minimizedCharts) {
  const { data, error, loading } = useFetchData("http://127.0.0.1:8000/storage");
  
  const sortedStorageData = useMemo(() => {
    (data ?? []).sort((a, b) => new Date(a.period) - new Date(b.period));
  }, [data]);

  const plotData = getGenericPlotData(sortedStorageData, "Storage (BCF)", "#f48c06");

  return (
    <RndPlotWrapper 
      bringToFront={bringToFront} 
      minimizeChart={minimizeChart} 
      minimizedCharts={minimizedCharts} 
      title="US Natural Gas Storage (BCF) — Actual" 
      plot={plotData}
      xLabel="Date"
      yLabel="Storage (BCF)"
    />
  );
};