import { useMemo } from "react";
import { useFetchData } from "../hooks/useFetchData";
import RndPlotWrapper from "../wrappers/RndPlotWrapper.react";
import { getGenericPlotData } from "../utils/getGenericPlotData";

export default function PricePlot(bringToFront, minimizeChart, minimizedCharts) {
  const { data, error, loading } = useFetchData("http://127.0.0.1:8000/prices");
  
  const sortedPriceData = useMemo(() => {
    (data ?? []).sort((a, b) => new Date(a.period) - new Date(b.period));
  }, [data]);

  const plotData = getGenericPlotData(sortedPriceData, "Price ($/MMBtu)");

  return (
    <RndPlotWrapper  
      bringToFront={bringToFront} 
      minimizeChart={minimizeChart} 
      minimizedCharts={minimizedCharts} 
      title="Henry Hub Natural Gas Spot Price ($/MMBtu)" 
      plot={plotData}
      xLabel="Date"
      yLabel="Price ($/MMBtu)"
    />
  );
};